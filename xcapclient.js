
var xcapClient = function (){

	this._baseUrl = '';
	this._username = '';
	this._password = '';
	this._uri = '';

	this._isReady = false;
	this._hasResourceLists = false;
	this._hasRlsServices = false;
	this._hasPidfManipulation = false;
	this.isUpdating = false;
	this._contacts = [];
	this._pidfIndex = 0;
	this._tupleId = '';
	this._status = '';
	this._etag = null;
	this._statusTimer = null;

	//------------------------------------------------------------------------------------------

	this.initialize = function(server, uri, username, password) {

		this._uri = uri;
		this._baseUrl = this._getBaseUrl(server);
		this._username = username;
		this._password = password;

		this._etag = null;
		this._status = 'online';
		this._tupleId = 'briefmsg' + Math.floor(Math.random() * 900 + 100);

		this._getXcapCaps();
	}

	this.dispose = function() {

		this.setStatus('offline');

		if(this._statusTimer != null)
			clearInterval(this._statusTimer);
	}

	this._getBaseUrl = function(server) {
		return 'http://' + server + '/xcap-root';
	}

	//------------------------------------------------------------------------------------------

	this.setStatus = function(status) {

		if(this._isReady) {

			if(this._status != status) {

				this._status = status;
				this._setStatus();
			}
		}
	}

	this._setStatus = function() {

		var headers = {};
		if(this._etag != null)
			headers['If-Match'] = this._etag;

		this._ajaxXcap({
			type: 'PUT',
			url: '/pidf-manipulation/users/' + this._uri + '/index',
			success: this._onSetStatus,
			error: this._onSetStatusError,
			headers: headers,
			contentType: 'application/xcap-el+xml',
			data: "<?xml version='1.0' encoding='UTF-8'?><presence xmlns='urn:ietf:params:xml:ns:pidf'>"
				+	"<tuple id='" + this._tupleId + "'>"
				+		"<status>"
				+			"<basic>" + ((this._status === 'offline') ? 'close' : 'open') + "</basic>"
				+		"</status>"
				+		"<contact>" + this._uri + "</contact>"
				+       "<note>" + this._getNote() + "</note>"
				+	"</tuple>"
			    + "</presence>"
		});
	}

	this._onSetStatus = function(data, textStatus, jqXHR){
		
		this._etag = jqXHR.getResponseHeader('ETag');
		
		if(this._statusTimer == null && this._status !== 'offline') {
			var that = this;
			this._statusTimer = setInterval(function() { that._setStatus.call(that); }, 50000);
		}
	}

	this._onSetStatusError = function(){
	
		this._etag = null;
	}

	this._getNote = function() {

		switch(this._status) {
			case 'online': return 'Online';
			case 'away': return 'Away';
			case 'busy': return 'Busy (DND)';
		}
		return this._status;
	}

	//------------------------------------------------------------------------------------------

	this._getXcapCaps = function() {

		this._ajaxXcap({
			url: '/xcap-caps/global/index',
			success: this._onGetXcapCaps
		});
	}

	this._onGetXcapCaps = function(xml) {

		this._isReady = true;
		
		var auids = xml.getElementsByTagName('auid');

		for(var i=0; i<auids.length; i++) {
			switch(auids[i].childNodes[0].nodeValue) {
				case 'resource-lists':
					this._hasResourceLists = true;
					break;
				case 'rls-services':
					this._hasRlsServices = true;
					break;
				case 'pidf-manipulation':
					this._hasPidfManipulation = true;
					break;
			}
		}

		if(this._hasPidfManipulation)
			this._setStatus();
	}

	//------------------------------------------------------------------------------------------

	this.startUpdate = function() {

		if(this._isReady == false || this._hasResourceLists == false){

			this.trigger({ type:'xcaperror' });
		}
		else {

			this.isUpdating = true;

			this._contacts = [];
			this._pidfIndex = 0;

			this._getResourceUsers();
		}
	}

	//------------------------------------------------------------------------------------------

	this._getResourceUsers = function() {

		this._ajaxXcap({
			url: '/resource-lists/users/' + this._uri + '/index',
			success: this._onGetResourceUsers
		});
	}

	this._onGetResourceUsers = function(xml) {

		this._processResourceUsers(xml);

		this.trigger({ type:'xcapdone', contacts:this._contacts });

		if(this._hasPidfManipulation)
			this._getPidf();
	}

	this._processResourceUsers = function(xml) {

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

			this._contacts.push(
				{ name: displayName, uri: uri });
		};
	}

	//------------------------------------------------------------------------------------------

	this._getPidf = function() {

		if(this._pidfIndex < this._contacts.length) {

			this._ajaxXcap({
				url: '/pidf-manipulation/users/' + this._contacts[this._pidfIndex].uri + '/index',
				success: this._onGetPidf,
				error: this._onGetPidfError,
				userParam: this._contacts[this._pidfIndex]
			});
		}
	}

	this._onGetPidf = function(xml, param) {

		param.status = null;

		var notes = xml.getElementsByTagName('note');

		for(var i=0; i<notes.length; i++) {
			var note = notes[i].childNodes[0].nodeValue.toLowerCase();
			switch(note) {
			case 'online':
			case 'away':
			case 'busy':
			case 'offline':
				param.status = note;
				break;
			case 'dnd':
				param.status = 'busy';
				break;
			default:
				if(note.indexOf('busy') >= 0)
					param.status = 'busy';
				else
					console.log('[ XCAP ] Unknow note value:', note);
				break;
			}
		}

		if(param.status == null) {

			var basics = xml.getElementsByTagName('basic');

			for(var i=0; i<basics.length; i++) {
				if(basics[i].childNodes[0].nodeValue === 'open') {
					param.status = 'online';
					break;
				}
			}
		}

		if(param.status == null)
			param.status = 'offline';

		this.trigger({ type:'xcapupdatecontact', contact: param });

		this._getNextPidf();
	}

	this._onGetPidfError = function(jqXHR) {

		if(jqXHR.status == 404) {

			this._getNextPidf();
		}
		else {

			this._onGeneralError(jqXHR);
		}
	}

	this._getNextPidf = function() {

		this._pidfIndex++;
		this._getPidf();
	}

	//------------------------------------------------------------------------------------------

	this._ajaxXcap = function(settings) {

		var self = this;

		$.ajax({
			type: settings.type || 'GET',
			url: this._baseUrl + settings.url,
			dataType: 'xml',
			username: this._username,
			password: this._password,
			contentType: settings.contentType,
			data: settings.data,
			crossDomain: true,
			context: this,
			headers: settings.headers,
			success: (typeof settings.userParam === 'undefined') ? settings.success 
				: function(jqXHR) { settings.success.call(self, jqXHR, settings.userParam); },
			error: settings.error || this._onGeneralError
		});
	}

	//------------------------------------------------------------------------------------------
/*
	this.finished = function() {

		this.isUpdating = false;

		this.trigger({ type:'xcapdone', contacts:this._contacts });
	}
*/
	this._onGeneralError = function(xhr) {

		this.isUpdating = false;
		this.trigger({ type:'xcaperror' });
	}

	//------------------------------------------------------------------------------------------

	this.handlers = [];
	
	this.onAny = function(handler) {
		this.handlers.push(handler);
	};

	this.trigger = function(event){
		for (var i=0; i<this.handlers.length; i++)
			this.handlers[i](event);
	};

	//------------------------------------------------------------------------------------------
}