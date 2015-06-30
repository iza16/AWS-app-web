var util = require("util");
var helpers = require("../helpers");
var Policy = require("../s3post").Policy;
var S3Form = require("../s3post").S3Form;
var AWS_CONFIG_FILE = "config.json";
var POLICY_FILE = "policy.json";
var INDEX_TEMPLATE = "index.ejs";
var AWS = require("aws-sdk");
AWS.config.loadFromPath('./config.json');

var s3 = new AWS.S3();
var APP_CONFIG_FILE = "./app.json";
var tablicaKolejki = helpers.readJSONFile(APP_CONFIG_FILE);
var linkKolejki = tablicaKolejki.QueueUrl
//obiekt kolejki z aws-sdk
var sqs=new AWS.SQS();
//obiekt do obsługi simple DB z aws-sdk
var simpledb = new AWS.SimpleDB();
var UPLOAD_TEMPLATE = "upload.ejs";

var simpledb = new AWS.SimpleDB();

var task = function(request, callback){
	
	//obiekt dzięki któemu będziemy listować plili z bucketu czubak z katalogu toProcess
	var params = {
		Bucket: 'borowiecka',
		Prefix: 'obrazki'
	};
	s3.listObjects(params, function(err, data) {
		if (err) console.log(err, err.stack);
		else     console.log(data);
		
		
		var linki = [];
		
		//przelatujemy przez każdy plik z bucketu
		for(var i in data.Contents) {
			//jeżeli nie jest to nazwa bucketu tylko plik
			if (data.Contents[i].Key != "obrazki/"){
				//dopisz do listy do wyświetlenia
				linki.push( {nazwa: data.Contents[i].Key.substring(10)});
			}
			console.log(i);
		}
	
	
		//adres hosta który wrzuca
		var ipAddress = request.connection.remoteAddress;
		console.log(ipAddress);
		
		//ładuje config amazona
		var awsConfig = helpers.readJSONFile(AWS_CONFIG_FILE);
		
		//ładuje config z danymi gdzie wrzucić plik i akcją powrotną
		var policyData = helpers.readJSONFile(POLICY_FILE);

		//przygotowuje obiekt konfiguracji wrzucania na s3
		var policy = new Policy(policyData);
		//generuje pola (inputy) wrzucania na s3
		var s3Form = new S3Form(policy);
		var fields = s3Form.generateS3FormFields();
		//tag dla pliku wrzucającego (widoczny w AWS console)
		fields.push( {name : 'x-amz-meta-uploader', value : 'Izabela Borowiecka'});
		//tag dla pliku ip (widoczny w AWS console)
		fields.push( {name : 'x-amz-meta-ip', value : ipAddress});
		//zbędne
		fields.push( {name : 'uploader', value : 'Izabela Borowiecka'});
		//dodaje niewidoczne pola potrzebne do uploadu
		var fieldsSecret=s3Form.addS3CredientalsFields(fields, awsConfig);
		
		//alternatywne opcje tego co wyżej
		//	fields += '<imput type="hidden" name="x-amz-meta-uploader" value="pawel.czubak"/>';
		//	fields.push( {name : 'x-amz-meta-uploader', value : 'pawel.czubak'});
		//	callback(null, {template: INDEX_TEMPLATE, params:{fields:fields, bucket:""}});
		
		//zwraca tekst strony www     przekazuje zmienne do templatki któa je wyświetla
		callback(null, {template: INDEX_TEMPLATE, params:{fields:fields, bucket:"borowiecka", fileList:linki}});
	});
	
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
					callback(null, "Nie ma takiego pliku.");
				}
				else {  
					//poszukuje pliku i sprawdza czy był już przetworzony 
					
					if(datacc.Attributes && datacc.Attributes[0].Value == "yes"){
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
											callback(null, {template: UPLOAD_TEMPLATE, params:{fileName:key.substring(10), bucket:"borowiecka"}});
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

function testx(){
	
}


exports.action = task;
