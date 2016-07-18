/*
 * app-messages.js
 * This file contains custom Node Module to manage all application level messages
 * @project   Node_Json_Crud
 * @author    Sanjeev
 */

'use strict';
//Module for storing all messages used  by server
module.exports = function appMessages() {
	var messages = {
		error:{
			updateFailed:"The update failed",
			updateAllFail:"The passed data length should be only one for update/replace all operation.",
			noRecordFound:"No record found, please pass valid data.",
			fileParseError:"Error in parsing file.",
			invalidData:"Please provide valid data.",
			invalidFileOrData:"Please provide valid file and valid data.",
			fileNotFound:"File not found.",
			dataAlreadyExists:"The data you are trying to append already exists.",
			noUniqueKey:"Please provide unique key.",
			alreadyExist:"Record(s) already exist."
		},
		info:{
			successfulUpdate:"Record(s) updated succesfully.",
			successfuldeleted:"Record(s) deleted succesfully."
		}
	};
	
	return messages;
};

