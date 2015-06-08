//Funkcje wspomagające
var helpers = require("./helpers");
//Folder z plikami stron
var ACTIONS_FOLDER = "./actions/";
//plik opisujący który plik strony otworzyć po określonej ścieżce
var ACTIONS_CONFIG_FILE = "actions.json";
//port na którym działa aplikacja
var PORT = 8080;

//ustawia strony względem patcha
var actionsCofig = helpers.readJSONFile(ACTIONS_CONFIG_FILE);
actionsCofig.forEach(function(elem){
	if(elem.action && elem.path){
		if(!elem.action.template){
			elem.action = require(ACTIONS_FOLDER + elem.action).action;
		}
	}else {
		console.log("unknown configuration: " + JSON.stringify(elem));
	}
});

//odpala serwer
var service = require("webs-weeia").http(actionsCofig);
service(PORT);