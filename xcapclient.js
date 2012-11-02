
var xcapClient = function (){

	this.baseUrl = '';
	this.username = '';
	this.password = '';
	this.uri = '';

	this.isReady = false;
	this.hasResourceLists = false;
	this.hasRlsServices = false;
	this.isUpdating = false;
	this.contacts = [];

	this.initialize = function(server, uri, username, password) {

		this.uri = uri;
		this.baseUrl = this.getBaseUrl(server);
		this.username = username;
		this.password = password;

		DigestAuthentication.registerCredentials('briefmsg', 'pass');

		this.getXcapCaps();
	}

	this.getContacts = function(uri) {

		if(this.isReady == false){

			this.trigger({ type:'xcaperror' });
		}
		else {

			this.isUpdating = true;

			this.contacts = [];

			if(this.hasResourceLists)
				this.getResourceUsers();
		}
	}

	this.getBaseUrl = function(server) {
		return 'http://' + server + '/xcap-root';
	}

	this.getXcapCaps = function() {

		this.ajaxXcap({
			url: '/xcap-caps/global/index',
			success: this.onGetXcapCaps
		});
	}

	this.onGetXcapCaps = function(xml) {

		this.isReady = true;
		
		var auids = xml.getElementsByTagName('auid');

		for(var i=0; i<auids.length; i++) {
			switch(auids[i].childNodes[0].nodeValue) {
				case 'resource-lists':
					this.hasResourceLists = true;
					break;
				case 'rls-services':
					this.hasRlsServices = true;
					break;
			}
		}
	}

	this.getResourceUsers = function() {

		this.ajaxXcap({
			url: '/resource-lists/users/' + this.uri + '/index',
			success: this.onGetResourceUsers
		});
	}

	this.onGetResourceUsers = function(xml) {

		this.processResourceUsers(xml);
	
		if(this.hasRlsServices)
			this.getRlsServices();
		else
			this.finished();
	}

	this.processResourceUsers = function(xml) {

		var entries = xml.getElementsByTagName('entry');
		for (var i = entries.length - 1; i >= 0; i--) {
			var entry = entries[i];
			var displayName = null;
			var uri = entry.getAttribute('uri');
			if(uri != null)
			{
				var displayNameNodes = entry.getElementsByTagName('display-name');
				if(displayNameNodes.length > 0)
					displayName = displayNameNodes[0].childNodes[0].nodeValue;
			}

			if(displayName == null)
				displayName = uri.substr(4);

			this.contacts.push(
				{ name: displayName, uri:uri });
		};
	}

	this.getRlsServices = function() {
	}	

	this.ajaxXcap = function(opt) {

		$.ajax({
			type: 'GET',
			url: this.baseUrl + opt.url,
			dataType: 'xml',
		//	username: this.username,
		//	password: this.password,
			crossDomain: true,
			context: this,
			success: opt.success,
			error: this.onError
		});
	}

	this.finished = function() {

		this.isUpdating = false;

		this.trigger({ type:'xcapdone', contacts:this.contacts });
	}

	this.onError = function(xhr) {

		this.isUpdating = false;
		this.trigger({ type:'xcaperror' });
	}


	this.handlers = [];
	
	this.onAny = function(handler) {
		this.handlers.push(handler);
	};

	this.trigger = function(event){
		for (var i=0; i<this.handlers.length; i++)
			this.handlers[i](event);
	};
}