/**
 * freeCodeCamp File Metadata — blob() test runner workaround
 *
 * HOW TO USE:
 * 1. Refresh the challenge page
 * 2. Open DevTools → Console on www.freecodecamp.org
 * 3. Paste this ENTIRE file, press Enter
 * 4. Wait for: "[fcc-test-patch] Ready — run tests now"
 * 5. Enter http://localhost:8080 and click "Run the Tests"
 *
 * The test iframe stubs response.blob(). This patch replaces fetch inside
 * the sandbox before each test. It also hooks createTestRunner for re-inits.
 */
(function patchFccBlobViaHooks() {
  const BLOB_PATCH = String.raw`
(function () {
  function mimeFromUrl(url) {
    if (/\.png$/i.test(url)) return "image/png";
    if (/\.(jpe?g)$/i.test(url)) return "image/jpeg";
    if (/\.gif$/i.test(url)) return "image/gif";
    if (/\.webp$/i.test(url)) return "image/webp";
    return "";
  }

  globalThis.fetch = async function (url, options) {
    const reqUrl = typeof url === "string" ? url : url?.url || "";
    const msg = { type: "fetch", url, ...(options && { options }) };
    const data = await new Promise(function (resolve) {
      const ch = new MessageChannel();
      ch.port1.onmessage = function (e) {
        ch.port1.close();
        resolve(e.data);
      };
      parent.postMessage(msg, "*", [ch.port2]);
    });

    const text = data.text;
    const type = mimeFromUrl(data.url || reqUrl) || "application/octet-stream";

    return {
      status: data.status,
      statusText: data.statusText,
      url: data.url,
      ok: data.status >= 200 && data.status < 300,
      text: function () {
        return Promise.resolve(text);
      },
      json: function () {
        return Promise.resolve(JSON.parse(text));
      },
      headers: {
        get: function (name) {
          if (String(name).toLowerCase() === "content-type") return type;
          return null;
        },
      },
      blob: function () {
        return Promise.resolve(new Blob([text], { type: type }));
      },
    };
  };
})();
`.trim();

  function mergeHooks(hooks) {
    hooks = hooks || {};
    const patchStmt = BLOB_PATCH + ";";
    return {
      ...hooks,
      beforeAll: patchStmt + (hooks.beforeAll ? "\n" + hooks.beforeAll : ""),
      beforeEach: patchStmt + (hooks.beforeEach ? "\n" + hooks.beforeEach : ""),
    };
  }

  function patchRunTest(runner) {
    if (!runner || runner.__fccRunTestPatched) return;
    const orig = runner.runTest.bind(runner);
    runner.runTest = function (test) {
      return orig(BLOB_PATCH + ";\n" + test);
    };
    runner.__fccRunTestPatched = true;
  }

  function installHook() {
    const runner = window.FCCTestRunner;
    if (!runner || runner.__fccBlobHookInstalled) {
      return !!runner?.__fccBlobHookInstalled;
    }

    const origCreate = runner.createTestRunner;
    if (typeof origCreate !== "function") {
      console.warn("[fcc-test-patch] FCCTestRunner.createTestRunner not found");
      return false;
    }

    runner.createTestRunner = async function (config, opts) {
      const result = await origCreate.call(
        this,
        { ...config, hooks: mergeHooks(config?.hooks) },
        opts
      );
      patchRunTest(result);
      return result;
    };

    patchRunTest(runner.getRunner("dom"));

    runner.__fccBlobHookInstalled = true;
    console.log(
      "[fcc-test-patch] Ready — run tests now (localhost:8080 must be running)"
    );
    return true;
  }

  if (installHook()) return;

  console.log("[fcc-test-patch] Waiting for FCCTestRunner to load...");
  const timer = setInterval(function () {
    if (installHook()) clearInterval(timer);
  }, 250);

  setTimeout(function () {
    clearInterval(timer);
    if (!window.FCCTestRunner?.__fccBlobHookInstalled) {
      console.error(
        "[fcc-test-patch] FCCTestRunner never appeared. Refresh and paste this BEFORE running tests."
      );
    }
  }, 60000);
})();
