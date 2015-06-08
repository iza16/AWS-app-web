var AWS = require("aws-sdk");
var os = require("os");
var crypto = require('crypto');
//zawiera funkcje pomocnicze generowania skrótów robienia z jonson obiektu ...
var helpers = require("../helpers");
//accessKeyId ... klucze do amazona 
AWS.config.loadFromPath('./config.json');
//obiekt dla instancji S3 z aws-sdk
var s3 = new AWS.S3();
//plik z linkiem do kolejki
var APP_CONFIG_FILE = "./app.json";
//dane o kolejce wyciągamy z tablicy i potrzebny link przypisujemy do linkKolejki
var tablicaKolejki = helpers.readJSONFile(APP_CONFIG_FILE);
var linkKolejki = tablicaKolejki.QueueUrl
//obiekt kolejki z aws-sdk
var sqs=new AWS.SQS();
//obiekt do obsługi simple DB z aws-sdk
var simpledb = new AWS.SimpleDB();
var UPLOAD_TEMPLATE = "upload.ejs";

//funkcja która zostanie wykonana po wejściu na stronę 
//request dane o zapytaniu, callback funkcja zwrotna zwracająca kod html
var task =  function(request, callback){
	
	//dane otrzymane z amazona po wrzuceniu
	//$_GET['bucket'], $_GET['key'], $_GET['etag']
	var bucket =  request.query.bucket;
	var key =  request.query.key;
	var etag =  request.query.etag;
	var ipAddress = request.connection.remoteAddress;
	//tablica z parametrami do pobrania naszego wrzuconego pliku i meta danych dla getObject
	var params = {
		Bucket: bucket,
		Key: key
	};

	//pobieramy plik (obiekt) i dane o nim
	s3.getObject(params, function(err, data) {
		if (err) {
			//jeżeli nie wrzucono takiego pliku a jest próba odwołania się do niego będzie log na konsoli
			console.log(err, err.stack);
		}
		else {
			//sprawdzamy czy plik był już przetworzony
			var paramsXXXXz = {
				DomainName: 'czubakProjState', //required 
				ItemName: 'ITEM001', // required 
				AttributeNames: [
					key,
				],
			};
			simpledb.getAttributes(paramsXXXXz, function(err, datacc) {
				if (err) {
					console.log(err, err.stack); // an error occurred
				}
				else {  
					//poszukuje pliku i sprawdza czy był już przetworzony 
					if(datacc.Attributes[0].Value == "yes"){
						console.log('----------------->Znalazlem przetworzony plik');
						callback(null, {template: UPLOAD_TEMPLATE, params:{fileName:key.substring(10), bucket:"czubak"}});
					}else{
						console.log('----------------->NIE Znalazłem przetworzonego pliku');
						//Po poprawnym wrzuceniu pliku i pobraniu jego danych
						console.log("Plik zostal wrzucony poprawnie i jego dane zostaly odczytane.");

						//wrzuca do bazy info, że jeszcze nie wygenerowano
						var paramsdb = {
							Attributes: [
								{ Name: key, Value: 'no', Replace: true}
							],
							DomainName: "czubakProjState", 
							ItemName: 'ITEM001'
						};
						simpledb.putAttributes(paramsdb, function(err, datass) {
							if (err) {
								console.log('ERROR'+err, err.stack);
							}
							else {
								
								//wrzuca do bazy dane logów czyli ip wrzucającego
								var paramsdb2 = {
									Attributes: [
										{ Name: key, Value: ipAddress, Replace: true}
									],
									DomainName: "czubakProjLog", 
									ItemName: 'ITEM001'
								};
								simpledb.putAttributes(paramsdb2, function(err, datass) {
									if (err) {
										console.log('ERROR'+err, err.stack);
									}
									else {
										//obiekt z parametrami do wysłania wiadomości dla kolejki 
										var sendparms={
											//MessageBody: bucket+"###"+key,
											MessageBody: "{\"bucket\":\""+bucket+"\",\"key\":\""+key+"\"} ",
											QueueUrl: linkKolejki,
											MessageAttributes: {
												key: {//dowolna nazwa klucza
													DataType: 'String',
													StringValue: key
												},
												bucket: {//dowolna nazwa klucza
													DataType: 'String',
													StringValue: bucket
												}
											}	
										};
										//wysłanie wiadomości do kolejki
										sqs.sendMessage(sendparms, function(err,data2){
											if(err) {
												console.log(err,err.stack);
												callback(null,'error');
											}
											else {
												console.log("Prosba o wyliczenie sktotu dodana do kolejki");
												console.log("MessageId: "+data2.MessageId);
											}
					
											//odczytuje z bazy dane i wywala na konsole
											var paramsXXXX4 = {
												DomainName: 'czubakProjState', //required 
												ItemName: 'ITEM001', // required 
											};
											simpledb.getAttributes(paramsXXXX4, function(err, data) {
												if (err) {
													console.log(err, err.stack); // an error occurred
												}
												else {     
													console.log(data);           // successful response
												}
											
											//Funkcja zwracająca kod HTML wyświetlany na ekranie
											//w templatce jest zapytanie ajaksowe
											callback(null, {template: UPLOAD_TEMPLATE, params:{fileName:key.substring(10), bucket:"czubak"}});
											//etag: +etag
											//IP: +data.Metadata.ip
											//Uploader: +data.Metadata.uploader
											});		
										});
									}
								});
							}  
						});
					}
				}
			});	
		}
	});
}
exports.action = task
