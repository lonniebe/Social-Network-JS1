//messages
const express = require('express')
const StatusCodes = require('http-status-codes').StatusCodes;
const package = require('./package.json');
const uuid = require('uuid'); //for unique id
const argon2 = require("argon2"); // for hashing
const fs = require('fs');
const path = require('path');
const moment = require('moment');

var db = require('./DB');
var users = require('./users');


function getTokenFromRequest(req){
		
	try{
		return JSON.parse(req.headers.authorization).token;
	}
	catch{
		return undefined;
	}
}

exports.send_message = function ( req, res )
{
	try{
		const id =  parseInt( req.params.id );
		const token = getTokenFromRequest(req);
		
		const text = req.body.text;

		if ( id <= 0)
		{
			res.status( StatusCodes.BAD_REQUEST );
			res.send( "Bad id given")
			return;
		}

		//find sendee
		const recipient = users.find_user_by_id(req, res);
		const idx = recipient.id;
		
		if ( idx < 0 )
		{
			res.status( StatusCodes.NOT_FOUND );
			res.send( "No such user")
			return;
		}

		if (!text)
		{			
			res.status( StatusCodes.BAD_REQUEST );
			res.send( "Missing text in request")
			return;
		}

		if (!token)
		{
			res.status( StatusCodes.BAD_REQUEST );
			res.send( "Missing token in request")
			return;
		}

		//find sender 
		const sender = users.find_user_by_token(req, res);
		if(sender == undefined){
			res.status( StatusCodes.BAD_REQUEST);
			res.send("Couldn't find user with key")
			return
		}

		//create post details
		let message_id = db.get_g_messages().length+1;
		let message_creationDate = moment().format('DD-MM-YYYY');
		let message_text = text;
		let message_sender_id = sender.id;
		let message_recipient_id = idx;

		//add message
		const new_message = { 	message_id: message_id , 
							sender_id: message_sender_id, 
							recipient_id: message_recipient_id,
							creation_date: message_creationDate,
							text: message_text	} ;

		res.send(  JSON.stringify( new_message) );

		db.addMessageToDB(new_message);
	}
	catch{
		res.status( StatusCodes.BAD_REQUEST);
		res.send("error: something happened")
	}
};

exports.send_messages = async function (req, res) {

	let check = users.authenticate_admin(req, res);
	let num_of_recipients = 0;
	if(check == "admin"){
		const text = req.body.text;

		if (!text)
		{
			res.status( StatusCodes.BAD_REQUEST );
			res.send( "Missing text in request")
			return;
		}
		let message_creationDate = moment().format('DD-MM-YYYY');
		let message_text = text;
		let message_sender_id = 0;
		
		//get not deleted users 
		const g_users = users.get_not_deleted_users();

		g_users.forEach(user => {
			//create message details
			let message_id = db.get_g_messages().length+1;
			let message_recipient_id = user.id;
			//add message
			const new_message = { 	message_id: message_id , 
								sender_id: message_sender_id, 
								recipient_id: message_recipient_id,
								creation_date: message_creationDate,
								text: message_text	
								};

			db.addMessageToDB(new_message);
			
			console.log(`user ${user.id} got message`);	
			
		});
		num_of_recipients = g_users.length;
	}
	res.send(  JSON.stringify(`sent successfully to ${num_of_recipients} users`)); 
}

exports.get_messages = function (req,res){
	
	try{
		const token = getTokenFromRequest(req);
		const id =  parseInt( req.params.id );

		if (!id)
		{
			res.status( StatusCodes.BAD_REQUEST );
			res.send( "Missing id in request")
			return;
		}
		if ( id <= 0)
		{
			res.status( StatusCodes.BAD_REQUEST );
			res.send( "Bad id given")
			return;
		}

		if (!token)
		{
			res.status( StatusCodes.BAD_REQUEST );
			res.send( "Missing token in request")
			return;
		}

		//find user
		const user = users.find_user_by_token(req,res);
		if(user == undefined){
			res.status( StatusCodes.BAD_REQUEST);
			res.send("no user with key")
			return
		}
		if(user.token != token){
			res.status( StatusCodes.BAD_REQUEST);
			res.send("only recipient can see mmesages")
			return
		}

		const filtered = db.get_g_messages().filter(message => user.id == message.recipient_id);
		filtered.reverse();
		res.send(  JSON.stringify( filtered) );
	}
	catch(e){
		res.status( StatusCodes.BAD_REQUEST);
			res.send("something went wrong")
			return
	}
	
}

exports.send_activation_msg = function(req,res){
	const user = users.find_user_by_id(req,res);

	if(user){

	let message_id = db.get_g_messages().length+1;
	let message_creationDate = moment().format('DD-MM-YYYY');
	let message_text = "please make me an active user";
	let message_sender_id = user.id;
	let message_recipient_id = 1;

	//add message
	const new_message = { 	message_id: message_id , 
						sender_id: message_sender_id, 
						recipient_id: message_recipient_id,
						creation_date: message_creationDate,
						text: message_text	} ;
	
	res.send(  JSON.stringify( new_message) );

	db.addMessageToDB(new_message);
}}
