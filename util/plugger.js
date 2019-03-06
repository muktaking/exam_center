const path = require('path');
const appDir = path.dirname(require.main.filename);
//plugger plugs plugin 

module.exports = function Plugger(name, type){
    const controller = require(appDir + "/plugins/" + type + '/' + name + '/controller/' + name);
    //const validator = require(appDir + "/plugins/" + type + '/' + name + '/util/validator');
    
    this.controller = controller;
    //this.validator = validator ? validator : null ;
}