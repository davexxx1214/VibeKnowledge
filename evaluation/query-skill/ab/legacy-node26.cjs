// Test-environment shim only: Nest TypeORM 7 uses this API removed from Node 26.
// This does not change application logic or mock repository behavior.
const util = require('util');
if (!util.isNullOrUndefined) util.isNullOrUndefined = value => value === null || value === undefined;
