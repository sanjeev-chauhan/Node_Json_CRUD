/*
 * node-api-demo.js
 * This file contains Demo for Node Restful Crud Api calls
 * @project   Node_Json_Crud
 * @author    Sanjeev
 */

var nodeAPIDemo = (function(santaModule){
	var init,
		attachEvents,
		addDataAPI,
		getDataAPI,
		updateDataAPI,
		deleteDataAPI;
	
	//Method to hit Node Restful Add Data API for adding new user details
	addDataAPI = function(){	
		var data = {
			data:[{
			name:$("#userName").val(), 
			id:$("#id").val(),
			title:$("#title").val()
			}],
			key:"id"
		};

		$.ajax({
		  url: "/api/add/test.json",
		  data:data,
		  type :"PUT"
		})
		.done(function( data ) {
			if ( data && data.success) {
				console.log("Success Status" + data.success);
			}
		});
	};
	
	getDataAPI = function(){
		var data = {
			key:"id",
			value:[$("#getUserDetailsId").val()]
		};

		$.ajax({
		  url: "/api/get/test.json",
		  data:data,
		  type :"GET"
		})
		.done(function( resp ) {
			if ( resp && resp.success) {
				console.log("Success Status" + resp.success,  "- Data" + JSON.stringify(resp.data));
			}
		});
	};
	
	updateDataAPI = function(){
		var data = {
			data:[{
				title:$("#updatedTitle").val()
			}],
			key:"id",
			value:$("#updateId").val()
		};

		$.ajax({
		  url: "/api/update/test.json",
		  data:data,
		  type :"PUT"
		})
		.done(function( data ) {
			if ( data && data.success) {
				console.log("Success Status" + data.success);
			}
		});
	};
	
	deleteDataAPI = function(){
		var data = {
		key:"id",
		data:[$("#deleteId").val()]
		};

		$.ajax({
		  url: "/api/delete/test.json",
		  data:data,
		  type :"DELETE"
		})
		.done(function( data ) {
			if ( data && data.success) {
				console.log("Success Status" + data.success);
			}
		});
	};
	
	attachEvents = function(){
		$("#addUser").on("click", addDataAPI);
		$("#getUserDetails").on("click", getDataAPI);
		$("#updateUser").on("click", updateDataAPI);
		$("#deletedUser").on("click", deleteDataAPI);
	};

	init = function(){
		attachEvents();
	}
	
	return {
		init:init
	}
	
})(window.nodeAPIDemo || {});

nodeAPIDemo.init(); // Initialize Node Restful API Module 
