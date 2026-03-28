const { expect } = require('chai');
const fs = require('fs');
const path = require('path');

const testemSource = fs.readFileSync(
  path.join(__dirname, '..', 'testem.js'),
  'utf8',
);

describe('CLI definition', function () {
  describe('global options', function () {
    it('declares the documented top-level options', function () {
      expect(testemSource).to.include(".option('-f, --file [file]'");
      expect(testemSource).to.include(".option('-p, --port [num]'"
      );
      expect(testemSource).to.include(".option('--host [hostname]'"
      );
      expect(testemSource).to.include(".option('-l, --launch [list]'"
      );
      expect(testemSource).to.include(".option('-s, --skip [list]'"
      );
      expect(testemSource).to.include(".option('-d, --debug [file]'"
      );
      expect(testemSource).to.include(".option('-t, --test_page [page]'"
      );
      expect(testemSource).to.include(".option('-g, --growl'"
      );
    });
  });

  describe('subcommands', function () {
    it('declares the launchers, ci, and server commands', function () {
      expect(testemSource).to.include(".command('launchers')");
      expect(testemSource).to.include(".command('ci')");
      expect(testemSource).to.include(".command('server')");
    });

    it('declares the ci-specific options', function () {
      expect(testemSource).to.include(".option('-T, --timeout [sec]'"
      );
      expect(testemSource).to.include(".option('-P, --parallel [num]'"
      );
      expect(testemSource).to.include(".option('-b, --bail_on_uncaught_error'"
      );
      expect(testemSource).to.include(".option('-R, --reporter [reporter]'"
      );
      expect(testemSource).to.include(".option('--cwd [path]'"
      );
      expect(testemSource).to.include(".option('--config_dir [path]'"
      );
    });
  });

  describe('example coverage', function () {
    it('includes every CLI option used in the examples', function () {
      expect(testemSource).to.include(".command('ci')");
      expect(testemSource).to.include(".option('-P, --parallel [num]'"
      );
      expect(testemSource).to.include(".option('-l, --launch [list]'"
      );
      expect(testemSource).to.include(".option('-p, --port [num]'"
      );
    });
  });
});
