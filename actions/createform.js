var util = require("util");
var helpers = require("../helpers");
var Policy = require("../s3post").Policy;
var S3Form = require("../s3post").S3Form;
var AWS_CONFIG_FILE = "config.json";
var POLICY_FILE = "policy.json";
var INDEX_TEMPLATE = "index.ejs";


var task = function(request, callback){
	

    var ipAddress = request.connection.remoteAddress;

console.log(ipAddress);
	
	
	
	//1. load configuration
	var awsConfig = helpers.readJSONFile(AWS_CONFIG_FILE);
	var policyData = helpers.readJSONFile(POLICY_FILE);

	//2. prepare policy
	var policy = new Policy(policyData);

	//3. generate form fields for S3 POST
	var s3Form = new S3Form(policy);
	//4. get bucket name
	
	var fields = s3Form.generateS3FormFields();
	fields.push( {name : 'x-amz-meta-uploader', value : 'pawel.czubak'});
	fields.push( {name : 'x-amz-meta-ip', value : ipAddress});
	fields.push( {name : 'uploader', value : 'pawel.czubak'});
	var fieldsSecret=s3Form.addS3CredientalsFields(fields, awsConfig);
//	fields += '<imput type="hidden" name="x-amz-meta-uploader" value="pawel.czubak"/>';
//	fields.push( {name : 'x-amz-meta-uploader', value : 'pawel.czubak'});
//	callback(null, {template: INDEX_TEMPLATE, params:{fields:fields, bucket:""}});
callback(null, {template: INDEX_TEMPLATE, params:{fields:fields, bucket:"lab4-weeia"}});
}

exports.action = task;
