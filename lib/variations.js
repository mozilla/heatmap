/** # About this (particular) example study:
  *
  * - 2 'arms', `strong` and `ut`
  * - isEligible for study IFF the preference is not already user set
  * - cleanup plan:  reset the pref.
  *
  */

var libfs = require("./fs");

const variations = {
  'observe_urls':  function() {
  }
}

/** is the User Eligible?  Called during INSTALL startups */
function isEligible() {
    return true;
}

/** Cleanup to run during uninstall / removal.
  * Should attempt to reset the user to original state
  */
function cleanup () {
  try {
    libfs.deleteAllJSONHistory()
  } catch (err) {
    console.log(err);
  }
}

module.exports = {
  isEligible: isEligible,
  cleanup: cleanup,
  variations: variations
}
