var AWS = require("aws-sdk");
var os = require("os");
var fs = require('fs');
//accessKeyId ... klucze do amazona 
AWS.config.loadFromPath('./config.json');

//zawiera funkcje pomocnicze generowania skrótów robienia z jonson obiektu ...
var helpers = require("../helpers");

//obiekt do obsługi simple DB z aws-sdk
var simpledb = new AWS.SimpleDB();

//funkcja która zostanie wykonana po wejściu na stronę 
//request dane o zapytaniu, callback funkcja zwrotna zwracająca kod html
var task =  function(request, callback){
	
	
	//$_GET['bucket'], $_GET['key'], $_GET['etag']
	var key =  request.query.key;
	
	//parametr do wybrania danych z bazy -- taki select ;p
	var paramsXXXX = {
		DomainName: 'borowieckaStatus', //required 
		ItemName: 'ITEM001', // required 
		AttributeNames: [
			key,
		],
	};
	
	simpledb.getAttributes(paramsXXXX, function(err, data) {
		if (err) {
			console.log(err, err.stack); // an error occurred
		}
		else {     
			//console.log(data);           // successful response
			console.log("OK");           // successful response
			if(data.Attributes){
				callback(null,data.Attributes[0].Value);
			}else{
				callback(null,"no");
			}
			
		}
	});	
	
}
exports.action = task
