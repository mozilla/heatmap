const X = require("../lib/variations");
const libfs = require("../lib/fs");

// module
exports['test module has right keys'] = function (assert) {
  ['cleanup', 'variations', 'isEligible'].forEach((k)=>{
    assert.ok(k in X, `${k} should be in experiment exports`);
  })
}

// functions don't throw
exports['test cleanup can run'] = function (assert) {
  assert.ok(X.cleanup () || true);
}

exports['test isEligible can run'] = function (assert) {
  assert.ok(X.isEligible() || true);
}


/**
  * SPECIFIC TO THIS STUDY - particular answers
  */


exports['test THIS isEligible ANSWER: is always true'] = function (assert) {
  assert.ok(X.isEligible());
}

exports['test THIS cleanup runs'] = function (assert) {
  // underlying function, non-wrapped
  assert.ok(libfs.deleteAllJSONHistory())
}

const VARIATION_NAMES = ['observe_urls'];
exports['test THIS variations exist, names are right, call functions'] = function (assert) {
  // underlying function, non-wrapped
  let seen = Object.keys(X.variations);
  assert.ok(seen.length == VARIATION_NAMES.length, "wrong number keys");
  seen.forEach((k)=>{
    assert.ok(VARIATION_NAMES.indexOf(k) >= 0, `${k} not seen`);
    let t = typeof X.variations[k];
    assert.ok(t === 'function', `${k} not function`)
  })
}

require("sdk/test").run(exports);
