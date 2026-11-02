import copy
import io
import hashlib
import json
from pathlib import Path
import stat
import sys
import tempfile
import types
import unittest
from unittest.mock import patch
import zipfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import updates


def release(version='12.0.0'):
    tag = 'v' + version
    name = f'DockStacks-{tag}.zip'
    return {'tag_name': tag, 'draft': False, 'prerelease': False,
            'html_url': f'https://github.com/{updates.REPO}/releases/tag/{tag}',
            'assets': [{'name': name, 'browser_download_url':
                        f'https://github.com/{updates.REPO}/releases/download/{tag}/{name}',
                        'digest': 'sha256:' + 'a' * 64, 'size': 123}]}


class UpdateTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.patcher = patch.multiple(updates, STATE=self.root/'state', CONFIG=self.root/'config',
            MANAGER=self.root/'manager', EXTENSION=self.root/'extension')
        self.patcher.start()

    def tearDown(self):
        self.patcher.stop()
        self.temp.cleanup()

    def test_versions_stable_only_and_no_downgrade(self):
        self.assertTrue(updates.parse_release(release(), (11, 0, 0))['available'])
        self.assertFalse(updates.parse_release(release('11.0.0'), (11, 0, 0))['available'])
        self.assertFalse(updates.parse_release(release('10.0.0'), (11, 0, 0))['available'])
        for tag in ['v12.0.0-beta', 'main', '../v12', 'v12.0.0;echo bad']:
            with self.assertRaises(updates.UpdateError):
                updates.version_tuple(tag)
        for key in ['draft', 'prerelease']:
            data=release();data[key]=True
            with self.assertRaises(updates.UpdateError):updates.parse_release(data,(11,0,0))

    def test_asset_origin_checksum_and_missing_package(self):
        for mutate in [lambda x:x.update(html_url='https://evil.test/release'),
            lambda x:x['assets'][0].update(browser_download_url='http://evil.test/payload'),
            lambda x:x['assets'][0].update(digest=''), lambda x:x.update(assets=[])]:
            data=release();mutate(data)
            with self.assertRaises(updates.UpdateError):updates.parse_release(data,(11,0,0))

    def test_daily_default_off_never_contacts_network(self):
        with patch.object(updates,'check_release') as check:
            self.assertTrue(updates.daily_check()['disabled'])
            check.assert_not_called()

    def test_timer_switch_on_off_and_preserves_other_preferences(self):
        updates.save_json(updates.CONFIG/'dockstacks/updates.json',{'daily':False,'other':7})
        with patch.object(updates.shutil,'which',return_value='/bin/systemctl'), patch.object(updates.subprocess,'run') as run:
            updates.set_daily(True)
            self.assertTrue(updates.preferences()['daily'])
            service=(updates.CONFIG/'systemd/user/dockstacks-updates.service').read_text()
            timer=(updates.CONFIG/'systemd/user/dockstacks-updates.timer').read_text()
            self.assertIn('--daily',service)
            self.assertIn('OnCalendar=daily',timer)
            updates.set_daily(False)
            self.assertFalse(updates.preferences()['daily'])
            self.assertEqual(updates.preferences()['other'],7)
            commands=[args[0][0] for args in run.call_args_list]
            self.assertIn(['systemctl','--user','disable','--now','dockstacks-updates.timer'],commands)
            self.assertIn(['systemctl','--user','stop','dockstacks-updates.service'],commands)

    def test_notify_once_and_snooze(self):
        updates.save_json(updates.CONFIG/'dockstacks/updates.json',{'daily':True})
        pending=updates.parse_release(release(),(11,0,0))
        with patch.object(updates,'check_release',return_value=pending), patch.object(updates,'notify_release',return_value=True) as notify:
            updates.daily_check();updates.daily_check()
            self.assertEqual(notify.call_count,1)
            (updates.STATE/'notification.json').unlink()
            updates.snooze();updates.daily_check()
            self.assertEqual(notify.call_count,1)

    def test_install_preserves_disabled_and_rollback(self):
        for directory in [updates.MANAGER, updates.EXTENSION]:
            directory.mkdir();(directory/'old').write_text('original')
        commands=[]
        def successful(args, **kwargs):
            commands.append(args)
            return types.SimpleNamespace(stdout='other-extension\n')
        backup=updates.install_downloaded(self.root,runner=successful)
        self.assertTrue(Path(backup).is_dir())
        self.assertIn(['gnome-extensions','disable',updates.UUID],commands)
        def failed(args, **kwargs):
            if args[0]=='bash':
                (updates.MANAGER/'old').write_text('modified')
                raise RuntimeError('failed')
            return types.SimpleNamespace(stdout=updates.UUID+'\n')
        with self.assertRaises(updates.UpdateError):updates.install_downloaded(self.root,runner=failed)
        self.assertEqual((updates.MANAGER/'old').read_text(),'original')

    def test_archive_traversal_symlink_and_complete_version(self):
        archive=self.root/'package.zip'
        with zipfile.ZipFile(archive,'w') as z:z.writestr('../escape','bad')
        with self.assertRaises(updates.UpdateError):updates.extract_package(archive,self.root/'out',12)
        with zipfile.ZipFile(archive,'w') as z:
            info=zipfile.ZipInfo('root/link');info.external_attr=(stat.S_IFLNK | 0o777)<<16
            z.writestr(info,'/tmp/escape')
        with self.assertRaises(updates.UpdateError):updates.extract_package(archive,self.root/'out',12)
        metadata={'uuid':updates.UUID,'version':12}
        inner=io.BytesIO()
        with zipfile.ZipFile(inner,'w') as z:z.writestr('metadata.json',json.dumps(metadata))
        with zipfile.ZipFile(archive,'w') as z:
            for name in ['dockstacks.py','updates.py','instalar.sh','instalar-visual.sh']:
                z.writestr('root/'+name,'# test')
            z.writestr('root/extension/metadata.json',json.dumps(metadata))
            z.writestr('root/carpetas-isla@manuel.local.shell-extension.zip',inner.getvalue())
        self.assertEqual(updates.extract_package(archive,self.root/'valid',12).name,'root')
        with self.assertRaises(updates.UpdateError):updates.extract_package(archive,self.root/'mismatch',13)

    def test_update_verifies_checksum_before_install(self):
        pending=updates.parse_release(release(),(11,0,0))
        pending['size']=3
        with patch.object(updates.os,'geteuid',return_value=1000), patch.object(updates,'check_release',return_value=pending), patch.object(updates,'request_bytes',return_value=b'bad'), patch.object(updates,'install_downloaded') as install:
            with self.assertRaisesRegex(updates.UpdateError,'SHA-256'):
                updates.apply_update('v12.0.0')
            install.assert_not_called()

    def test_installed_version_uses_older_component(self):
        updates.EXTENSION.mkdir()
        (updates.EXTENSION/'metadata.json').write_text('{"version":10}')
        self.assertEqual(updates.installed_version(),(10,0,0))
        (updates.EXTENSION/'metadata.json').write_text('{"version":12}')
        self.assertEqual(updates.installed_version(),(11,0,0))

    def test_full_verified_download_reaches_installer(self):
        metadata={'uuid':updates.UUID,'version':12}
        inner=io.BytesIO()
        with zipfile.ZipFile(inner,'w') as z:z.writestr('metadata.json',json.dumps(metadata))
        archive=io.BytesIO()
        with zipfile.ZipFile(archive,'w') as z:
            for name in ['dockstacks.py','updates.py','instalar.sh','instalar-visual.sh']:
                z.writestr('DockStacks-v12.0.0/'+name,'# fixture')
            z.writestr('DockStacks-v12.0.0/extension/metadata.json',json.dumps(metadata))
            z.writestr('DockStacks-v12.0.0/carpetas-isla@manuel.local.shell-extension.zip',inner.getvalue())
        content=archive.getvalue()
        data=release();data['assets'][0]['size']=len(content)
        data['assets'][0]['digest']='sha256:'+hashlib.sha256(content).hexdigest()
        def response(url,*args,**kwargs):
            return content if kwargs.get('download') else json.dumps(data).encode()
        def installed(root):
            self.assertTrue((root/'dockstacks.py').is_file())
            return '/backup'
        with patch.object(updates.os,'geteuid',return_value=1000), patch.object(updates,'installed_version',return_value=(11,0,0)), patch.object(updates,'request_bytes',side_effect=response), patch.object(updates,'install_downloaded',side_effect=installed) as install:
            self.assertEqual(updates.apply_update('v12.0.0')['installed'],'v12.0.0')
            install.assert_called_once()

    def test_no_release_and_failed_network_are_distinguished(self):
        from urllib.error import HTTPError
        with patch.object(updates,'request_bytes',side_effect=HTTPError('https://api.github.com',404,'missing',{},None)):
            self.assertTrue(updates.check_release()['no_release'])
        with patch.object(updates,'request_bytes',side_effect=HTTPError('https://api.github.com',403,'rate limited',{},None)):
            with self.assertRaises(updates.UpdateError):updates.check_release()


if __name__=='__main__':unittest.main()
