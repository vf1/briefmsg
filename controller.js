
var controller = function(isDemo) {

	var enableButton = function(button, enable){
		if(enable)
			button.removeClass('ui-disabled');
		else{
			button.addClass('ui-disabled');
			//button.removeClass('ui-btn-hover-a');
			//button.removeClass('ui-btn-active');
		}
	}

	var createTemplate = function(name){

		function template(item){
			this.container = item.parent();
			this.template = Handlebars.compile(item.html());
		};

		template.prototype.empty = function(){
			this.container.empty();
			return this;
		};
		template.prototype.append = function(data){
			this.container.append(this.template(data));
			return this;
		};
		template.prototype.get = function(data){
			return this.template(data);
		};
		
		return new template($(name));
	};

	var handlebarsIndex = function() {
		var index = 0;
		Handlebars.registerHelper('getCount', function() {
			return index++;
		});
		Handlebars.registerHelper('resetCount', function() {
			index = 0;
		})
	}();


	var main = this;
	var contacts = [];
	var quickReplies = [];
	var messages = [];
	var connected = false;
	var options;
	var initialHistoryLength;
	var isPhonegap = (typeof cordova !== 'undefined');
	
	var findContactByUri = function(uri){
		for(var i=0; i<contacts.length; i++)
			if(contacts[i].uri == uri)
				return contacts[i];
		return;
	}
	
	var isContactContainUri = function(uri){
		return (typeof findContactByUri(uri) !== 'undefined');
	}
	

	var selcontacts = new function(){
	
		var selected = [];
		var allContacts = [];
		var template1 = createTemplate('#selcontacts-li-unchecked');
		var template2 = createTemplate('#selcontacts-li-checked');
	
		this.getSelected = function(){
			return $.grep(allContacts, function(value, index) { return selected[index]; } );
		}
		
		this.setSelected = function(select){
		
			createContacts();

			selected = $.map(allContacts, function(value, index){
				for(var i=0;i<select.length; i++){
					if(select[i] == value.uri)
						return true;
				}
				return false;
			});
		}

		this.onPageBeforeShow = function(){

			createContacts();
			this.refreshListview();
		};

		this.refreshListview = function(){

			template1.empty();
			for(var i=0; i<allContacts.length; i++){
				if(selected[i])
					template2.append({contact:allContacts[i], index:i});
				else
					template1.append({contact:allContacts[i], index:i});
			}
			template1.container.listview('refresh');			
		}

		this.onXcapDone = function(event){
			console.log(event);
			$.mobile.loading('hide');

			allContacts = allContacts.concat(event.contacts).sort();

			this.refreshListview();
		}

		this.onXcapError = function(){
			$.mobile.loading('hide');
		}

		this.onPageShow = function(){
			$.mobile.loading('show', { text:'Loading contacts...', textVisible: true });

			main.internalTrigger({ type:'get-xcap-contacts' });

			// setTimeout(function() {
			// 	$.mobile.loading('hide');				
			// }, 12000);
		}

		this.clear = function(){
			selected = [];
			allContacts = [];
		}
		
		this.onClick = function(li){
			var index = li.data('index');
			if(selected[index])
				li.replaceWith(template1.get({contact:allContacts[index], index:index}));
			else
				li.replaceWith(template2.get({contact:allContacts[index], index:index}));
			selected[index] = !selected[index];
			template1.container.listview('refresh');
		};
		
		template1.container.on('click', 'li', function(f){
			selcontacts.onClick($(this));
		});
		
		var createContacts = function(){
			allContacts = addFromMessages(contacts.slice(0)).sort();
		}
		
		var addFromMessages = function(array){
			for(var i=0; i<messages.length; i++){
				if(isContain(array, messages[i].sender) == false)
					array.push({ name: messages[i].sender.substring(4), uri: messages[i].sender });
			}
			return array;
		}
		
		var isContain = function(array, uri){
			for(var i=0; i<array.length; i++)
				if(array[i].uri == uri)
					return true;
			return false;
		}
	};
	

	var editmsg = new function(){

		var timer;
		var maxLength = 1024;
		var remainLimit = maxLength*3/4;
		var oldLength = maxLength+1;
	
		var ctrl = new function(){
			this.text = $('#editmessage-text');
			this.send = $('#editmessage a.[href="#sending"]');
			this.remainText = $('#editmessage #editmessage-remain');
			this.remainValue = this.remainText.children('span');
		}

		this.getText = function(){
			return ctrl.text.val();
		};
		
		this.setText = function(text){
			ctrl.text.val(text);
		}
		
		this.clear = function(){
			ctrl.text.val('');
		};
		
		this.updateControls = function(){

			var length = ctrl.text.val().length;
			
			if(oldLength != length){

				if(length > maxLength)
					ctrl.text.val(ctrl.text.val().substring(0, maxLength));
				
				if((oldLength>0) != (length>0))
					enableButton(ctrl.send, (length>0));
				
				if(length < remainLimit){
					if(oldLength >= remainLimit)
						ctrl.remainText.hide();
				}
				else{
					if(oldLength < remainLimit)
						ctrl.remainText.show();
					ctrl.remainValue.text(maxLength - length);
				}
				
				oldLength = length;
			}
		}
		
		this.onTextKeyUp = function(){
			return (this.updateControls() < maxLength);
		}

		this.onPageBeforeShow = function(){
			this.updateControls();
		}
		
		this.onPageShow = function(){
			timer = setInterval(this.updateControls, 1000);
			ctrl.text.focusEnd();
		}
		
		this.onPageHide = function(){
			clearInterval(timer);
		}
		
		this.onSendBtn = function(){
			if(ctrl.text.val().length > 0){
				$.mobile.changePage('#sending', { changeHash: false });
				main.internalTrigger({type: 'send', to: selcontacts.getSelected(), text: editmsg.getText()});
			}
			return false;
		};

		ctrl.send.on('click', function(){
			return editmsg.onSendBtn();
		});

		ctrl.text.on('keyup', function(){
			editmsg.updateControls();
		});

		ctrl.text.on('keypress', function(event){
			if (event.keyCode == 13)
				event.preventDefault();
		});
	}	
	
	
	var editcontact = new function(){

		var template = createTemplate('#contacts-li');
		var deleteTemplate = createTemplate('#deletecontact-template');
		var deleteIndex = -1;
		var nameCtrl = $('#addcontact-name');
		var uriCtrl = $('#addcontact-uri');
		
		var ctrl = new function(){
			this.form = $('#addcontact-form');
		}
		
		this.update = function(){
			template.empty().append(contacts);
			template.container.listview('refresh');
		};
		
		this.updateDeleteDialog = function(index){
			deleteTemplate.empty().append(contacts[deleteIndex = index]);
		};

		this.onAdd = function(){
			if(validator.form()){
				var contact = {status:'unknow', name:nameCtrl.val(), uri: 'sip:' + uriCtrl.val()};
				contacts.push(contact);
				this.update();
				main.internalTrigger({type:'contactschanged', contacts:contacts});
				nameCtrl.val('');
				uriCtrl.val('');
				return true;
			}
			return false;
		};

		this.onDelete = function(){
			var contact = contacts.splice(deleteIndex, 1)[0];
			this.update();
			main.internalTrigger({type:'contactschanged', contacts:contacts});
		};

		var validator = ctrl.form.validate({
			onsubmit: false,
			rules: {
				name: {
					required: true,
					maxlength: 24
				},
				uri: {
					required: true,
					email: true
				}
			},
			errorElement: 'div'
		});

		ctrl.form.on('submit', function() { return editcontact.onAdd(); });
		
		var that = this;
		
		$('#deletecontact-yes').on('click', function(f){
			that.onDelete();
		});
		
		$('#addcontact-ok').on('click', function(f){
			return that.onAdd();
		});
		
		$(document).on('pagebeforechange', function(f, data){
			if (typeof data.toPage === "string"){
				if(data.toPage.indexOf('deletecontact')>0){
					var re = /\?index=([0-9]+)/;
					that.updateDeleteDialog(parseInt(re.exec(data.toPage)[1]));
				}
			}
		});
		
		$(document).on('pagebeforeshow', function(f, data){
			if(f.target.id == 'contacts')
				that.update();
		});
	};
	
	

	var loginas = new function(){
	
		var form = $('#loginas-form');
		var loginBtn = $('#loginas a.[href="#login"]');
		var logoutBtn = $('#loginas a.[href="#logout"]');

		enableButton(logoutBtn, false);
		
		var enableControls = function(enable){
			if(enable)
				form.find('input').removeClass('ui-disabled');
			else
				form.find('input').addClass('ui-disabled');
		}
		
		this.setLoginInfo = function(login){
			for(var key in login){
				form.find('[name="' + key + '"]').val(login[key]);
			}
		}

		this.onConnecting = function(){
			enableControls(false);
		};
		
		this.onConnected = function(){
			enableButton(loginBtn, false);
			enableButton(logoutBtn, true);
		};
		
		this.onDisconnected = function(){
			enableControls(true);
			enableButton(loginBtn, true);
			enableButton(logoutBtn, false);
		};

		this.onConnectError = this.onDisconnected;
		
		var getFormData = function(form){
			var result = {};
			var array = form.serializeArray();
			for(var i in array) {
				result[array[i].name] = array[i].value;
			}
			return result;
		}

		this.onLogin = function(){
			if(connected == false){
				if(validator.form()){
					enableControls(false);
					main.internalTrigger({type:'login', login:getFormData(form)});
					return true;
				}
			}
			return false;
		}
		
		form.on('submit', function() { return loginas.onLogin(); });
	
		var that = this;
		
		loginBtn.on('click', function(){
			return that.onLogin();
		});
		
		logoutBtn.on('click', function(){
			main.internalTrigger({type:'logout'});
			return false;
		});
		
		var validator = form.validate({
			onsubmit: false,
			rules: {
				name: {
					required: true,
					maxlength: 16
				},
				domain: {
					required: true,
					maxlength: 128
				}
			},
			errorElement: 'div'
		});
	};


	
	var quickreply = new function(){
	
		var template1 = createTemplate('#quickreplylist');
		
		this.update = function(){

			quickReplies.sort();

			template1.empty().append(quickReplies);
			template1.container.trigger('create');
		};
		
		this.onClickReply = function(text){
			console.log('onClickReply');
			main.internalTrigger({type: 'send', to: selcontacts.getSelected(), text: text});
		}
		
		this.onPageBeforeShow = this.update;
		
		template1.container.on('click', 'a', function(){
			quickreply.onClickReply($(this).text());
		});
	}
	

	var editquick = new function(){

		var template2 = createTemplate('#editquickreplylist');
		var inputCtrl = $('#editquickreply-add');

		this.update = function(){
			
			template2.empty().append(quickReplies);
			template2.container.trigger('create');
		};

		this.onRemove = function(text){
			quickReplies = $.grep(quickReplies, function(value) {return value != text;} );
			this.update();
			main.internalTrigger({type: 'quickreplieschanged', quicks: quickReplies});
		}

		this.onAdd = function(){
			var text = inputCtrl.val();
			inputCtrl.val('');
			quickReplies.push(text);
			this.update();
			quickReplies.sort();
			main.internalTrigger({type: 'quickreplieschanged', quicks: quickReplies});
		}

		this.onPageBeforeShow = this.update;
		
		template2.container.on('click', 'a', function(){
			quickreply.onRemove($(this).data('value'));
		});
		
		$('#editquickreply-addbutton').on('click', function (){
			quickreply.onAdd();
		});
	}
	
	
	var sending = new function(){

		var index = 0;
		var total = 0;
		
		var ctrl = new function(){
			this.index = $('#sending-contact-index');
			this.total = $('#sending-contact-total');
		}

		this.update = function(){
			ctrl.index.text(index);
			ctrl.total.text(total);
		}
		
		this.onSend = function(){
			total = index = 0;
			this.update();
		}

		this.onBeforeSendOne = function(){
			total++;
			this.update();
		}
		
		this.onSentOne = function(e){
			index++;
			this.update();
			
			if(index >= total){
				setTimeout(function(){
					main.internalTrigger({type:'sent'});
					console.log('go to #sent');
					$.mobile.changePage('#sent');
				}, 1000);
			}
		}
	}


	var optionsui = new function(){
	
		var form = $('#options-form');

		this.onPageBeforeShow = function(){
			for(var key in options){
				if(typeof options[key] === 'boolean'){
					form.find('[name="' + key + '"][type="checkbox"]').attr('checked', options[key]).checkboxradio("refresh");
				}
				else{
					console.error('Not implemented');
				}
			}
		}

		this.onPageBeforeHide = function(){
			var opt = {};
			form.find('input[type=checkbox]').each(function (index, item){
				var checkbox = $(item);
				opt[checkbox.attr('name')] = !(typeof checkbox.attr('checked') == 'undefined');
			});
			options = opt;
			main.internalTrigger({type:'optionschanged', options:opt});
		}
		
		form.on('submit', function() { return false; });
	}


	var sent = new function(){
	
		var template1 = createTemplate('#sent-list');
		var results = new Array();

		var ctrl = new function(){
			this.ok = $('#sent a.[href="#message"]');
		}

		this.onSend = function(){
			results = new Array();
		}
		
		this.onBeforeSendOne = function(e){
			results.push({id: e.id, name: e.contact.name});
		}

		this.onSentOne = function(e){
			var i = findResult(e.id);
			if(i >= 0){
				results[i]['phrase'] = e.phrase;
			}
		}

		this.onPageBeforeShow = function(e){
			template1.empty();
			template1.append(results);
			template1.container.listview('refresh');
		}

		this.onOkBtn = function(e){
			if(typeof initialHistoryLength !== 'undefined' && typeof history.length !== 'undefined' && history.length != initialHistoryLength && isDemo == false){
				var offset = initialHistoryLength - history.length;
				console.log('history.go ' + offset);
				history.go(offset);
			}
			else{
				console.log('Do not know initialHistoryLength, go to #message');
				$.mobile.changePage('#message');
			}
		}
		
		ctrl.ok.on('click', function(){
			sent.onOkBtn();
			return false;
		});

		var findResult = function(id){
			for(var i=0; i<results.length; i++)
				if(results[i].id == id)
					return i;
			return -1;
		}
	}


	var messagesui = new function(){
	
		this.index = 0;

		var NOMESSAGE = 1;
		var VIEW1 = 2;
		var VIEW2 = 3;
		var state = -1;
		
		var GONEXT = 1;
		var GOPREV = 2;
		
		var messageView = function($view){
			
			this.view = $view;
			this.sender = $view.find('.message-sender').first();
			this.time = $view.find('.message-time').first();
			this.text = $view.find('.message-text').first();
			
			this.update = function(message){
				var contact = findContactByUri(message.sender);
				this.sender.text((typeof contact === 'undefined') ? message.sender : contact.name);
				this.time.text(message.time.toLocaleTimeString() + ' ' + message.time.toLocaleDateString());
				//this.text.text(message.text);
				this.text.html(message.text.split('\n').join('<br/>'));
			}
		}
		
		var ctrl = new function(){
			this.page = $('#message');
			this.index = $('#messages-index');
			this.total = $('#messages-total');
			this.indexTotal = $('#messages-indextotal');
			this.quick = $('#message-quick');
			this.reply = $('#message-reply');
			this.next = $('a.[href="#message-next"]');
			this.prev = $('a.[href="#message-prev"]');
			this.deletex = $('a.[href="#message-delete"]');
			this.noMessage = $('#message-nomessages');
			this.newMessage = $('#message a.[href="#selcontacts"]');
			
			this.enable = function(name, value){
				var flagName = 'is' + name + 'Enabled';
				if(this[flagName] == 'undefined' || this[flagName] != value){
					enableButton(this[name], value);
					this[flagName] = value;
				}
			}
		}
		
		this.update = function(animation){
	
			if(state < 0)
				return;
	
			if(messages.length > 0){
				
				if(state == NOMESSAGE){
					ctrl.noMessage.hide();
					ctrl.indexTotal.show();
				}
				
				if($.isNumeric(animation)){
				
					var active;
					var hidden;
					
					if(state == VIEW1){
						state = VIEW2;
						active = ctrl.message1;
						hidden = ctrl.message2;
					}
					else{
						state = VIEW1;
						active = ctrl.message2;
						hidden = ctrl.message1;
					}

					hidden.view.removeClass('slide in out reverse');
					hidden.update(messages[this.index]);
					active.view.hide();
					hidden.view.addClass('slide in' + ((animation == GOPREV) ? ' reverse' : ''));
					hidden.view.show();
				}
				else{
					if(state == VIEW1){
						ctrl.message1.update(messages[this.index]);
					}
					else if(state == VIEW2){
						ctrl.message2.update(messages[this.index]);
					}
					if(state == NOMESSAGE){
						state = VIEW1;
						ctrl.message1.update(messages[this.index]);
						ctrl.message1.view.show();
					}
				}

				ctrl.index.text(this.index + 1);
				ctrl.total.text(messages.length);
			}
			else{
				if(state != NOMESSAGE){
					state = NOMESSAGE;
					ctrl.noMessage.show();
					ctrl.indexTotal.hide();
					ctrl.message1.view.hide();
					ctrl.message2.view.hide();
				}
			}

			ctrl.enable('next', this.index < messages.length-1);
			ctrl.enable('prev', this.index > 0);
			ctrl.enable('quick', (messages.length > 0) && connected);
			ctrl.enable('reply', (messages.length > 0) && connected);
			ctrl.enable('deletex', messages.length > 0);
			ctrl.enable('newMessage', connected);
		};
		
		this.onPageHide = function(){
			ctrl.message1.view.removeClass('slide in out reverse');
			ctrl.message2.view.removeClass('slide in out reverse');
		}
		
		this.onPageInit = function(){
			ctrl['message1'] = new messageView($('div.message-view').first().hide());
			ctrl['message2'] = new messageView(ctrl.message1.view.clone().insertAfter(ctrl.message1.view));
			ctrl.noMessage.show();
			ctrl.indexTotal.hide();
			state = NOMESSAGE;
		}
		
		this.onPageShow = function(){
			this.update();
			if(typeof initialHistoryLength === 'undefined'){
				initialHistoryLength = history.length;
				console.log('set initialHistoryLength: ' + initialHistoryLength );
			}
		}

		this.onNext = function(){
			if(this.index < messages.length-1){
				this.index++;
				this.update(GONEXT);
			}
		};
		
		this.onPrev = function(){
			if(this.index > 0){
				this.index--;
				this.update(GOPREV);
			}
		};
		
		this.onDelete = function(){
			if(messages.length > 0){
				messages.splice(this.index, 1);
				var goPrev = (this.index >= messages.length && messages.length > 0);
				if(goPrev)
					this.index = messages.length-1;
				this.update(goPrev ? GOPREV : GONEXT);
				main.internalTrigger({type:'messageschanged', messages:messages});
			}
		};
		
		this.onReply = function(){
			selcontacts.setSelected([messages[this.index].sender]);
			//editmsg.setText(messages[this.index].text.replace(new RegExp('^', 'mg'), '>') + '\n');
			var text = messages[this.index].text;
			var index = text.lastIndexOf('\n');
			if(index > 0)
				text = text.substring(index + 1);
			if(text.length > 0)
				text = '>' + text + '\n';
			editmsg.setText(text);
		}

		this.onQuickReply = function(){
			selcontacts.setSelected([messages[this.index].sender]);
		}

		this.onIncomingMessage = function(e){
			messages.push(e);
			this.index = messages.length-1;
			this.update(GONEXT);
			main.internalTrigger({type:'messageschanged', messages:messages});
		};
		
		this.onConnected = this.update;
		this.onDisconnected = this.update;
		
		var nextShim = function(){
			messagesui.onNext();
			return false;
		}
		ctrl.next.on('vclick', nextShim);
		ctrl.page.on('swipeleft', nextShim);

		var prevShim = function(){
			messagesui.onPrev()
			return false;
		}
		ctrl.prev.on('vclick', prevShim);
		ctrl.page.on('swiperight', prevShim);
		
		ctrl.deletex.on('click', function(){
			messagesui.onDelete();
			return false;
		});
		
		ctrl.reply.on('click', function(){
			messagesui.onReply();
			return true;
		});

		ctrl.quick.on('click', function(){
			messagesui.onQuickReply();
			return true;
		});
	};



	var sound = new function(){

		var incoming;
		var outgoing;
		var extension;

		var playCordovaMedia = function(media, src){
			//if(isPhonegap){
			//	navigator.notification.beep(1);
			//}
			if (typeof Media !== 'undefined') {
				if (!media){
					console.log('Sound: Cordova Media');
					media = new Media(((device.platform.toLowerCase() == 'android') ? '/android_asset/www/' : '') + src + '.mp3', 
						function(){
							console.debug('Cordova Media: Ok, ' + src);
						},
						function(error){
							console.error('Cordova Media: Err, ' + error.code + ', ' + error.message);
						}
					);
				}
				else{
					media.stop();
					media.seekTo(0);
				}
				if (media){
					media.play();
					return true;
				}
			}
			return false;
		}

		var getExtension = function(){

			if(typeof extension === 'undefined'){
			
				var audio = new Audio();
			
				if(typeof audio.canPlayType === 'function'){
					if(audio.canPlayType('audio/mpeg') !== '')
						extension = '.mp3';
					else if(audio.canPlayType('audio/wav') !== '')
						extension = '.wav';
					else {
						console.error('No compatible audio file');
						extension = '.mp3';
					}
				}
				else{
					console.log('Audio.canPlayType is not available');
					extension = '.mp3';
				}
				
				console.log('Audio format: ' + extension);
			}
			
			return extension;
		}

		var playHtml5Audio = function(audio, src){
		
			if (typeof Audio !== 'undefined') {
				if (!audio){
					console.log('Sound: HTML5 Audio');
					audio = new Audio(src + getExtension());
				}
				else{
					audio.pause();
					audio.currentTime = 0;
				}
				if (audio){
					audio.play();
					return true;
				}
			}
			return false;
		}
		
		var play = function(audio, src){
			if (playCordovaMedia(audio, src) == false){
				if(playHtml5Audio(audio, src) == false){
					console.log('Sound: No Audio');
				}
			}
		}
		
		this.onIncomingMessage = function(){
			if(options.playWhenArrives)
				play(incoming, 'sounds/incoming');
		}

		this.onSent = function(){
			if(options.playAfterSending)
				play(outgoing, 'sounds/outgoing');
		}		
	}
	

	
	var toasts = new function(){

		var pageId;

		var ctrl = new function(){
			this.connecting = new function(){};
			this.connected = new function(){};
			this.disconnecting = new function(){};
			this.disconnected = new function(){};
			this.connectError = new function(){};
			this.connectErrorReason = new function(){};
		}
		
		this.initialize = function(){

			var template = Handlebars.compile($('#toasts').html());
			
			$('div[data-role="page"]').each(function(index, xpage){

				var page = $(xpage);
				var id = page.attr('id');

				page.find('div[data-role="content"]').append(template());

				ctrl.connecting[id] = page.find('div.toast-connecting');
				ctrl.connected[id] = page.find('div.toast-connected');
				ctrl.disconnecting[id] = page.find('div.toast-disconnecting');
				ctrl.disconnected[id] = page.find('div.toast-disconnected');
				ctrl.connectError[id] = page.find('div.toast-connect-error');
				ctrl.connectErrorReason[id] = ctrl.connectError[id].children('span');
			});
		};
		
		this.initialize();
		
		this.onPageBeforeShow = function(event){
			pageId = event.target.id;
			cancelAll();
		};
		
		this.onConnecting = function(){
			if(hasToasts()){
				cancelAll();
				ctrl.connecting[pageId].toast('show');
			}
		};
		
		this.onConnected = function(){
			if(hasToasts()){
				cancelAll();
				ctrl.connected[pageId].toast('show');
			}
		};
		
		this.onDisconnecting = function(){
			if(hasToasts()){
				cancelAll();
				ctrl.disconnecting[pageId].toast('show');
			}
		};
		
		this.onDisconnected = function(){
			if(hasToasts()){
				cancelAll();
				ctrl.disconnected[pageId].toast('show');
			}
		};
		
		this.onConnectError = function(e){
			if(hasToasts()){
				cancelAll();
				ctrl.connectErrorReason[pageId].text(e.reason);
				ctrl.connectError[pageId].toast('show');
			}
		};

		var hasToasts = function(){
			if(typeof pageId === 'undefined')
				return false;
			if(ctrl.connecting[pageId] === undefined)
				return false;
			return true;
		}
		
		var cancelAll = function(){
			if(hasToasts()){
				ctrl.connecting[pageId].toast('cancel');
				ctrl.connected[pageId].toast('cancel');
				ctrl.disconnecting[pageId].toast('cancel');
				ctrl.disconnected[pageId].toast('cancel');
				ctrl.connectError[pageId].toast('cancel');
			}
		}
	}
	
	
	
	var tasks = new function(){
	
		var handlers = [];
		var pageEvents = ['onPageBeforeShow', 'onPageBeforeHide', 'onPageShow', 'onPageHide'];
		var pageInitEvents = ['onPageBeforeCreate', 'onPageCreate', 'onPageInit'];
		var genericEvents = ['onSend', 'onBeforeSendOne', 'onSentOne', 'onSent',
			'onConnecting', 'onConnected', 'onDisconnecting', 'onDisconnected', 'onConnectError',
			'onIncomingMessage', 'onXcapDone', 'onXcapError'];
			
		var pageEventTypes = $.map(pageEvents, function(value, index){
			return value.substring(2).toLowerCase();
		});
		
		this.trigger = function(event, data){
			if (handlers[event.type] !== undefined) {
				var isPageEvent = (pageEventTypes.indexOf(event.type) >= 0);
				var handlers1 = handlers[event.type];
				for (var i=0; i<handlers1.length; i++)
					if( isPageEvent == false || handlers1[i].id == event.target.id || handlers1[i].id == '*'){
						console.log('call ' + handlers1[i].id + '::' + event.type);
						handlers1[i].handler.call(handlers1[i].obj, event, data);
					}
			}
		};
		
		var on = function(type, pageId, obj, handler) {
			if (handlers[type] === undefined)
				handlers[type] = [];
			handlers[type].push( {obj:obj, handler:handler, id:pageId} );
		};

		this.register = function(id, task){
			var allEvents = pageEvents.concat(genericEvents).concat(pageInitEvents);
			for(var i=0; i<allEvents.length; i++)
				if(task[allEvents[i]] !== undefined){
					console.debug('on ' + id + '.' + allEvents[i]);
					var name = allEvents[i].substring(2).toLowerCase();
					var method = task[allEvents[i]];
					if(pageInitEvents.indexOf(allEvents[i]) < 0)
						on(name, id, task, method);
					else
						$('#'+id).on(name, function(event){
							console.log('call ' + id + '::' + event.type);
							method.call(task, event);
						});
				}
		}
		
		// subscribe to jquerymobile events
		var handler = this.trigger;
		$.each(pageEvents, function(index, item){
			$(document).on(item.substring(2).toLowerCase(), handler);
		});
	}

	
	
	this.setOptions = function(value){
		options = value;
	}
	
	this.setContacts = function(array){
		contacts = array;
	};

	this.setQuickReplies = function(array){
		quickReplies = array;
	};
	
	this.setMessages = function(array){
		messages = array;
	};
	
	this.setLoginInfo = function(login){
		loginas.setLoginInfo(login);
		loginInfo = login;
	};
	
	
	this.onConnected = function(){
		connected = true;
		this.setItem('connected', 'yes');
	};
	
	this.onDisconnected = function(){
		connected = false;
	};

	var isMenuAvailable = false;
	
	this.onPageBeforeShow = function(event){
		if(event.target.id == 'message'){
			isMenuAvailable = true;
			editmsg.clear();
			selcontacts.clear();
		}
		else{
			isMenuAvailable = false;
		}
	}

	function endsWith(str, suffix) {
		return str.indexOf(suffix, str.length - suffix.length) !== -1;
	}

	var loginInfo;
	
	this.onLoad = function(){
		if(this.getItem('connected') == 'yes'){
			setTimeout(function(){
				main.internalTrigger({type:'login', login:loginInfo});
			}, 2000);
		}

		// PhoneGap
		document.addEventListener('deviceready', onDeviceReady, false);
	};
	
	$(window).on('load', function(event){
		main.onLoad();
	});

	if(isPhonegap == false && isDemo != true){
		$(window).on('beforeunload', function(){
			return 'If you close Brief Msg, you won\'t be able to send and recieve messages.';
		});
	}
	
	////////////////////////////////////////////////////////////////////////////////////////////////
	// PhoneGap
	this.onMenuButton = function(){
		if(isMenuAvailable)
			$.mobile.popup('#menu');
	}

    function onDeviceReady() {
        document.addEventListener('menubutton', function() { main.onMenuButton(); }, false);
    }

	////////////////////////////////////////////////////////////////////////////////////////////////
	// TASK REGISTRATION
	tasks.register('*', this);
	tasks.register('message', messagesui);
	tasks.register('sending', sending);
	tasks.register('sent', sent);
	tasks.register('options', optionsui);
	tasks.register('loginas', loginas);
	tasks.register('selcontacts', selcontacts);
	tasks.register('quickreply', quickreply);
	tasks.register('editquickreply', editquick);
	tasks.register('editmessage', editmsg);
	tasks.register('sound', sound);
	tasks.register('*', toasts);
	
	this.handlers = [];
	
	this.on = function(type, handler) {
		if (this.handlers[type] === undefined)
			this.handlers[type] = [];
		this.handlers[type].push(handler);
	};

	this.internalTrigger = function(event){
		tasks.trigger(event);
		if (this.handlers[event.type] !== undefined) {
			var handlers1 = this.handlers[event.type];
			for (var i=0; i<handlers1.length; i++)
				handlers1[i](event);
		}
	};
	
	this.trigger = function(event){
		console.log('external event ' + event.type);
		tasks.trigger(event);
	}
};
