/*
 * server.js
 * This file contains Node Js Restful APIs to perform CRUD operations on data files(json format)
 * @project   Node_Json_Crud
 * @author    Sanjeev
 */

// Import the node packages we need to use 
var express    = require('express');        // call express
var app        = express();                 // define our app using express
var bodyParser = require('body-parser');
var fs = require("fs");
var Deferred = require("promised-io/promise").Deferred;
var extend = require('extend');
var ssi = require("ssi");

var customMessagesModule = require('./server_modules/app-messages'); // This is custom module for app level messages
var appMessages = customMessagesModule();


/* Configure app to use bodyParser(). This will let us get the data from a request body */
// parse request data as application/x-www-form-urlencoded 
app.use(bodyParser.urlencoded({ extended: false }));
// parse request data as JSON 
app.use(bodyParser.json({ type: 'application/*+json' }))

var staticResourcesDirectoryPath = __dirname + "/app";

var parser = new ssi(staticResourcesDirectoryPath, "", "");

//CORS middleware
var allowCrossDomain = function(req, res, next) {
    //res.header('Access-Control-Allow-Origin', 'example.com');
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

    next();
}

app.use(allowCrossDomain);
/*app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
*/
// Handle server side includes for shtml files
app.use(function(req,res,next) {
	var filename = staticResourcesDirectoryPath + req.path;

	//If resource has .shtml then parse it and send it else go to next middleware
	if( /\.shtml$/.test(filename) && fs.existsSync(filename)) {
		//console.log("parsed shtml file");
		res.send(parser.parse(filename, fs.readFileSync(filename, {encoding: "utf8"})).contents);	
	} else {
		next();
	}
});


//Adds the static middleware to serve static content like html/css/js/images etc
app.use(express.static(staticResourcesDirectoryPath));
//app.use(express.static(__dirname, { maxAge: 86400000 }));


var dataFilesBasePath = "app/data/"; // Base path for storing all data files

// ROUTES FOR OUR API
var router = express.Router();              // get an instance of the express Router


//To set common response headers for all the API's calls
app.get('*', function(req, res, next) {
	res.setHeader("X-UA-Compatible", "IE=Edge,chrome=1");
	//console.log("request came");
	next();
});


/**
 * [getFileData Fetch data from file if file exists]
 * @param  {String} path Takes file path which need to be fetched
 * @return {Object} Returns json file content as Object Literal in promise else returns error message
 */
var getFileData = function(path){
	var deferred = new Deferred();
	
	//Check if the file exists or not, if not then reject promise with error message
	fs.exists(path, function(exists){
		if (!exists) {	
		   console.error(path + " - " + appMessages.error.fileNotFound);
		   return deferred.reject(appMessages.error.fileNotFound);
	    }
		else{//If file exists then read file content and return as Json object
			fs.readFile(path, function (err, data) {
				if (err) {
					console.error(err);
					deferred.reject(err);
				}
				else{
					try {
					   JSON.parse(data.toString());
					   deferred.resolve(JSON.parse(data.toString()));	
					}
					catch (e) {//If Json parsing of file fails then handle error and reject promise with error message
					   console.error(err)
					   deferred.reject(appMessages.error.fileParseError);
					}
				}
			});
		}		
	});
	
	// return the promise that is associated with the Deferred object
	return deferred.promise;
};


/**
 * [updateFileData Updates data in existing file]
 * @param  {String} path Takes file path which need to be updated
 * @param  {Object} data Data to be updated in file in Object Literal form
 * @param  {String} key The key holds property name that is to be used for searching record in file						
 * @param  {String} value <optional> The value if passed will be used to match records for update
 * @return {String} The success or fail messages are returned in promise
 */
var updateFileData = function(path, data, key, value){
	var deferred = new Deferred(),
		fileData,
		dataToUpdate = data,
		searchKey = key,
		searchValue = value,
		searchValuePassed = (typeof searchValue === "undefined"?false:true),
		matchFound = false;

	//Check if the file exists or not, if not then reject promise with error message
	fs.exists(path, function(exists){
		if (exists) {
			//If File exists then read that file content and update matched records
			fs.readFile(path, function (err, data) {
				if (err) {
					console.error(err);
					deferred.reject(err);
				}
				else{
					try {
					    fileData = JSON.parse(data.toString());
						if(searchKey){
							/* If user has not passed search Value then find object in file data that matches
							with passed data object using their searchKey values and update that file object*/
							if(!searchValuePassed){
								for(var k = 0 ; k< dataToUpdate.length; k+=1 ){
									for(var i = 0 ; i< fileData.length; i+=1 ){
										/* 
										Check if passed data searchKey value matches file object searchKey value. 
										Intentionally used double equality operator as passed value is always in string 
										*/
										if(fileData[i][searchKey] == dataToUpdate[k][searchKey]){
											/* Merge matched object in file data with passed data object and not replace as user may be paased 
											only few properties in data object that needs to be updated in file system */
											extend(fileData[i], dataToUpdate[k]);
											matchFound = true;
											break;
										}
									}
								}
							}
							else {
								/* 
								If user has passed search Value then find all matching records in file data where 
								value of searchKey property in file object matches passed searchValue and update those file object
								with passed data.
								Note : In this case the data array length should be only one as we need to update all matched records
								with this single object
								*/
								if(dataToUpdate.length ===1){
									for(var i = 0 ; i< fileData.length; i+=1 ){
										/* 
										Check if passed data searchKey value matches file object searchKey value. 
										Intentionally used double equality operator as passed value is always in string 
										*/
										if(fileData[i][searchKey] == searchValue){
											/* Merge matched object in file data with passed data object and not replace as user may be paased 
											only few properties in data object that needs to be updated in file system */
											extend(fileData[i], dataToUpdate[0]);
											matchFound = true;
											//break;
										}
									}
								}
								else{
									deferred.reject(appMessages.error.updateAllFail);
								}
							}
						}
						//If match found and record has been updated then write update data in file
						if(matchFound){
							 fs.writeFile(path, JSON.stringify(fileData), function (err) {
								if (err) {
									console.error(err);
									deferred.reject(err);
								}
								else{
									deferred.resolve(appMessages.info.successfulUpdate);				
								}
							});
						}
						else{
							deferred.reject(appMessages.error.noRecordFound);
						}
					}
					catch (e) {//If Json parsing of file fails then handle error and reject promise with error message
					   console.error(err)
					   deferred.reject(appMessages.error.fileParseError);
					}
				}
			});	
	   }
	   else{
		   deferred.reject(appMessages.error.invalidFileOrData);
	   }
	});
	
	return deferred.promise;
};

/**
 * [appendData Append data in existing file if exists or create a new file]
 * @param  {String} path Takes file path in which data need to be appended or the new file which needs to be created.
 * @param  {Object} data Data to be appended in file in Object Literal form
 * @param  {String} key The key holds property name that is to be used for searching if record already exists
 * @param  {Boolean} checkUnique The boolean param to determine if duplication check needs to be run befor adding records
 * @return {String} Returns success or fail message in promise
 */
var appendData = function(path, data, key, checkUnique){
	var deferred = new Deferred(),
		fileData,
		dataToUpdate = data,
		uniqueKey = key,
		duplicate,
		dataToAppend = [];
		
	//Check if the file exists or not, if not then create new file and write data
	fs.exists(path, function(exists){
		if (exists) {
			//If File exists then read that file content and see if records already exists or not
			fs.readFile(path, function (err, data) {
				if (err) {
					console.error(err);
					deferred.reject(err);
				}
				else{
					try {
					    fileData = JSON.parse(data.toString());
						if(uniqueKey){
							if(checkUnique){
								for(var k = 0 ; k< dataToUpdate.length; k+=1 ){
									duplicate = false;
									for(var i = 0 ; i< fileData.length; i+=1 ){
										/* 
										Check if passed data uniqueKey value matches any file object uniqueKey value. 
										If record is not already present then append
										Intentionally used double equality operator as passed value is always in string 
										*/
										if(fileData[i][uniqueKey] == dataToUpdate[k][uniqueKey]){
											//dataToAppend.push(dataToUpdate[k])
											duplicate = true;
											break;
										}
									}
									if(!duplicate){
										dataToAppend.push(dataToUpdate[k]);
									}
								}
							}
							else{
								dataToAppend = 	dataToUpdate;
							}
							//If match found and record has been updatd then write update data in file
							if(dataToAppend.length>0){
								fs.writeFile(path, JSON.stringify(fileData.concat(dataToAppend)), function (err) {
									if (err) {
										console.error(err);
										deferred.reject(err);
									}
									else{
										deferred.resolve(appMessages.info.successfulUpdate);				
									}
								});
							}
							else{
								deferred.reject(appMessages.error.alreadyExist);	
							}
						}
						else{
							deferred.reject(appMessages.error.noUniqueKey);	
						}
					}
					catch (e) {//If Json parsing of file fails then handle error and reject promise with error message
					   console.error(err)
					   deferred.reject(appMessages.error.fileParseError);
					}
				}
			});	
	   }
	   else {//If file does not exist then create a file and write passed data in it
		    fs.writeFile(path, JSON.stringify(dataToUpdate), function (err) {
				if (err) {
					console.error(err);
					deferred.reject(err);
				}
				else{
					deferred.resolve(appMessages.info.successfulUpdate);				
				}
			});
	   }
	});
	
	return deferred.promise;
};

/**
 * [deleteData Delete data from existing file]
 * @param  {String} path Takes file path from which data need to be deleted
 * @param  {Array} data List of IDs to be deleted in existing file 
 * @param  {String} key The key holds property name that is to be used for matching records in file
 * @return {String} Returns success or fail message in promise
 */
var deleteData = function(path, data, key){
	var deferred = new Deferred(),
		fileData,
		dataToUpdate = data,
		uniqueKey = key,
		isDeleteted = false;
		
	//Check if the file exists or not, if not then create new file and write data
	fs.exists(path, function(exists){
		if (!exists) {	
		   console.error(path + " - " + appMessages.error.fileNotFound);
		   return deferred.reject(appMessages.error.fileNotFound);
	    }
		else{//If file exists then read file content and return as Json object
			fs.readFile(path, function (err, data) {
				if (err) {
					console.error(err);
					deferred.reject(err);
				}
				else{
					try {
					   fileData = JSON.parse(data.toString());
					   for(var k = 0 ; k< dataToUpdate.length; k+=1 ){
						    for(var i = 0 ; i< fileData.length; i+=1 ){
								if(fileData[i][uniqueKey] == dataToUpdate[k]){
									fileData.splice(i,1);
									isDeleteted = true;
									break;
								}
							}
					   }
					    if(isDeleteted){
							fs.writeFile(path, JSON.stringify(fileData), function (err) {
									if (err) {
										console.error(err);
										deferred.reject(err);
									}
									else{
										deferred.resolve(appMessages.info.successfuldeleted);				
									}
								});
					    }
						else{
							deferred.reject(appMessages.error.noRecordFound);
						}
					}
					catch (e) {//If Json parsing of file fails then handle error and reject promise with error message
					   console.error(err)
					   deferred.reject(appMessages.error.fileParseError);
					}
				}
			});
		}
	});			
	
	return deferred.promise;
}



/**
 * [get Service to get json data from a file. Can return full json file content or return filtered data]
 * @param  {String} fileName The file name whose  data needs to be fetched
 * @param  {String} projectFolder <optional> The project specific folder for maintaining that project dat 
 * files, can be used to prevent duplicate file names from different projects
 * @param  {String}	key <optional> The key holds property name that is to be used for filtering records in file	
 * @param  {String}	value <optional> The value of key property that is to be used for filtering records in file									
 * @return {Object} Returns all the file records of filtered records on success
 */
router.get('/get/:fileName/:projectFolder*?', function(req, res) {
	if(req.params.fileName){
		var filePath,
			fileName = req.params.fileName,
			key = req.query.key,
			searchValue = req.query.value,
			projectFolder = req.params.projectFolder,
			searchValuePassed = (typeof searchValue ==="undefined"?false:true),
			searchValueIsArray,
			fileDataLen,
			content =[],
			i,
			j;
		
		if(projectFolder){
			filePath = dataFilesBasePath + "/" + projectFolder + fileName;
		}
		else{
			filePath = dataFilesBasePath + fileName;
		}
		
		try{
			if(Array.isArray(searchValue)){
				searchValue = searchValue;
				searchValueIsArray = true;
			}
			//Check If values are passed for filtering in array
			else if(Array.isArray(JSON.parse(searchValue))){
				searchValue = JSON.parse(searchValue);
				searchValueIsArray = true;
			}
		}
		catch (e){
			searchValueIsArray = false;
		}
		
		//Fetch file data and handle sucees and error scenarios
		getFileData(filePath).then(
			function(fileData){
				fileDataLen = fileData.length; 
				//If user passed key & value then filter the data and send filtered content, else send full file content
				if(fileDataLen && key && searchValuePassed){
					//If values(can be multiple) are passed in array then filter data from json based on array values
					if(searchValueIsArray){
						for(j = 0 ; j < searchValue.length ; j+=1){
							for(i = 0 ; i < fileDataLen ; i+=1){
								//Intentionally used double equality operator to match passed searchValue with object values as 
								//passed searchValue is always string
								if(fileData[i][key] == searchValue[j]){
									content.push(fileData[i]);//Push all matching objects in content array
								}
							}
						}
					}else{
						for(i = 0 ; i < fileDataLen ; i+=1){
							//Intentionally used double equality operator to match passed searchValue with object values as 
							//passed searchValue is always string
							if(fileData[i][key] == searchValue){
								content.push(fileData[i]);//Push all matching objects in content array
							}
						}
					}
				}
				else if(fileDataLen){
					content = fileData;
				}
				res.json({"success":true, "data":content});
			},
			function(err){
				res.json({"success":false, "error":err, "data":null});
			}
		);	
	}
	else{
		res.json({"success":false,"message":appMessages.error.invalidFileOrData});
	}
});	


/**
 * [update Service to update record in existing file. Valid Url can be /api/update/filename or /api/update/filename/projectName]
 * @param {String} fileName The file name whose  data needs to be updated
 * @param {String} projectFolder <optional> The project specific folder for maintaining that project dat 
 * files, can be used to prevent duplicate file names from different projects.
 * @param  {Array}	data List of objects in json or x-www-form-urlencoded form which needs to be updated in file, can be multiple
 * @param  {String}	key The key holds property name that is to be used for matching records in file	
 * @param  {String}	value <optional> The value of key property that is to be used for matching records in file									
 * @return {Object} Returns Json object with success status and message 
 */
router.put('/update/:fileName/:projectFolder*?', function(req, res) {
	if(req.params.fileName && req.body.data && req.body.key){
		var filePath,
			fileName = req.params.fileName,
			data = req.body.data,
			key = req.body.key,
			value = req.body.value,
			projectFolder = req.params.projectFolder;
		
		if(typeof data ==="string")	{
			data = JSON.parse(data);
		}	
		
		if(projectFolder){
			filePath = dataFilesBasePath + "/" + projectFolder + fileName;
		}
		else{
			filePath = dataFilesBasePath + fileName;
		}

		updateFileData(filePath,data, key, value).then(
			function(resp){
				res.json({"success":true,"message":resp});
			},
			function(err){
				res.json({"success":false,"error":err});
			}
		);	
	}
	else{
		res.json({"success":false,"error":appMessages.error.invalidFileOrData});
	}
});


/**
 * [add Service to add data in json file if exist or create new file. Valid Url can be /api/add/filename
 *  or /api/add/filename/projectName]
 * @param {String} fileName The file name in which  data needs to be added
 * @param {String} projectFolder <optional> The project specific folder for maintaining that project dat 
 * files, can be used to prevent duplicate file names from different projects.
 * @param  {Array}	data List of objects in json or x-www-form-urlencoded form which needs to be added in file, can be multiple
 * @param  {String}	key The key holds property name that is to be used for checking duplicacy  in file	
 * @param  {Boolean} checkUnique <optional> The boolean param to dtermine if duplication check needs to be run befor adding records								
 * @return {Object} Returns Json object with success status and message 
 */
router.put('/add/:fileName/:projectFolder*?', function(req, res) {
	if(req.body.data){
		var filePath,
			fileName = req.params.fileName,
			data = req.body.data,
			key = req.body.key,
			projectFolder = req.params.projectFolder,
			checkUnique = true;
			
		if(typeof req.body.checkUnique !=="undefined"){
			if(req.body.checkUnique === "false"){
				checkUnique = false;
			}	
		}
		if(typeof data ==="string")	{
			data = JSON.parse(data);
		}
		
		if(projectFolder){
			filePath = dataFilesBasePath + "/" + projectFolder + fileName;
		}
		else{
			filePath = dataFilesBasePath + fileName;
		}
		if((checkUnique && key) || !checkUnique){
			appendData(filePath,data, key, checkUnique).then(
				function(resp){
					res.json({"success":true,"message":resp});
				},
				function(err){
					res.json({"success":false,"error":err});
				}
			);	
		}
		else{
			res.json({"success":false,"error":appMessages.error.noUniqueKey});
		} 
	}
	else{
		res.json({"success":false,"error":appMessages.error.invalidData});
	}
});


/**
 * [delete Service to delete data in existing json file. Valid Url can be /api/delete/filename
 *  or /api/delete/filename/projectName]
 * @param {String} fileName The file name from which  data needs to be deleted
 * @param {String} projectFolder <optional> The project specific folder for maintaining that project dat 
 * files, can be used to prevent duplicate file names from different projects.
 * @param  {Array}	data List of Ids which needs to be deleted from file, can be multiple
 * @param  {String}	key The key holds property name that is to be used for matching records in file					
 * @return {Object} Returns Json object with success status and message 
 */
router.delete('/delete/:fileName/:projectFolder*?', function(req, res) {
	if(req.body.key && req.body.data && req.body.data.length>0){
		var filePath,
			fileName = req.params.fileName,
			data = req.body.data,
			key = req.body.key,
			projectFolder = req.params.projectFolder;
			
		if(typeof data ==="string")	{
			data = JSON.parse(data);
		}
		
		if(projectFolder){
			filePath = dataFilesBasePath + "/" + projectFolder + fileName;
		}
		else{
			filePath = dataFilesBasePath + fileName;
		}

		deleteData(filePath, data, key).then(
			function(resp){
				res.json({"success":true,"message":resp});
			},
			function(err){
				res.json({"success":false,"error":err});
			}
		);	
		
	}
	else{
		res.json({"success":false,"error":appMessages.error.invalidData});
	}
	
});	
	
// REGISTER OUR ROUTES ==================
// All of our routes will be prefixed with /api
app.use('/api', router);

// Access app with this  url  http://localhost:8000)
app.set('port', process.env.PORT || 8000);

// START THE SERVER ==================
app.listen(app.get('port'), function() {
	console.log('Server started on localhost:' + app.get('port') + '; Press Ctrl-C to terminate.');
});