
var sipDemoClient = function (){

	var client = this;
	var connected = false;
	var count = 0;

    this.register = function(){

		client.trigger({type: 'connecting'});
		client.trigger({type: 'connected'}, 1000);
    }

    this.unRegister = function(){

		client.trigger({type: 'disconnecting'});
		client.trigger({type: 'disconnected'}, 1000);
    }
	
	this.send = function(contacts){
	
		for(var i=0; i<contacts.length; i++){
			count++;
			client.trigger({type: 'beforesendone', id: count, contact: contacts[i], uri: contacts[i].uri });
			client.trigger({type: 'sentone', id: count, uri: contacts[i].uri, success: true, phrase: 'OK' }, 1000 + i*100);
		}
	}

	this.emulateIncomingMessage = function(sender, text){

		client.trigger({
			type: 'incomingmessage',
			sender: sender,
			time: new Date(),
			text: text
		});
	}

	this.handlers = [];
	
	this.onAny = function(handler) {
		this.handlers.push(handler);
	};

	this.trigger = function(event, delay){
		if($.isNumeric(delay)){
			setTimeout(function(){
				for (var i=0; i<client.handlers.length; i++)
					client.handlers[i](event);
				}, delay);
		}
		else{
			for (var i=0; i<this.handlers.length; i++)
				this.handlers[i](event);
		}
	};
}