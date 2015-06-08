var assert = require("assert");
var createform = require("../actions/createform.js");
describe("createform", function(){
    it("should have action function", function(){
        assert.equal(createform.action instanceof Function, true,"typeof action: " + typeof createform.action);
    });
});
describe("createform function", function(){
    it("createform should not return 0 with no args ", function(){
        var discount = createform.action();
        assert.notEqual(createform, 0, createform + "");
    });
});