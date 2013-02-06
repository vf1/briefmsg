
var Desktop = function (setStatusEvent, beforeQuitEvent) {

	this._setStatusEvent = setStatusEvent;
	this._beforeQuitEvent = beforeQuitEvent;

	this._isReady = false;
	this._isMinimized = false;
	this._isOptionsUnitilized = true;
	this._popupOnNew = false;

	this._gui = null;
	this._win = null;
	this._tray = null;
	this._menu = null;
	this._menuItems = null;

	this._blinkInterval = null;
	this._icon = null;
	this._blinkState = null;

	this._windowPosInterval = null;

	this._width = -1;
	this._height = -1;

	this._initialize();
}

Desktop.prototype = {

	_initialize: function() {

		if(typeof require === 'undefined') return;
		this._gui = require('nw.gui');

		if(typeof this._gui === 'undefined') return;
		this._win = this._gui.Window.get();

		this._menuItems = { online: this._newMenuItem('online'), away: this._newMenuItem('away'), busy: this._newMenuItem('busy') };

		this._menu = new this._gui.Menu();
		this._menu.append(new this._gui.MenuItem({ label: 'Exit', click: $.proxy(this._onExitClick, this) }));
		this._menu.append(new this._gui.MenuItem({ type: 'separator' }));
		this._menu.append(this._menuItems.online);
		this._menu.append(this._menuItems.away);
		this._menu.append(this._menuItems.busy);

		this._tray = new this._gui.Tray({ title: 'Brief Msg', icon: 'images/icon16-offline.png', menu: this._menu });

		var onMinimize = function() {
			this._win.hide();
			this._isMinimized = true;
		}

		this._win.on('minimize', $.proxy(onMinimize, this));
		this._win.on('close', $.proxy(onMinimize, this));
		this._tray.on('click', $.proxy(this._onRestore, this));

		this._isReady = true;

		this._windowPosInterval = setInterval($.proxy(this._saveWindowPos, this), 1000);
	},

	_onRestore: function() {
		this._win.show();
		this._win.resizeTo(this._width, this._height);
		this._isMinimized = false;
		this._blink(false);
	},

	_saveWindowPos: function() {
		if(this._isReady && !this._isMinimized && localStorage) {
			this._width = this._win.width;
			this._height = this._win.height;
			localStorage.desktopX = this._win.x;
			localStorage.desktopY = this._win.y;
			localStorage.desktopWidth  = this._win.width;
			localStorage.desktopHeight = this._win.height;
		}
	},


	_onExitClick: function() {
		setTimeout(this._gui.App.quit, 2000);

		isReady = false;
		clearInterval(this._windowPosInterval);

		this._win.hide();

		this._tray.remove();
		tray = null;

		this._beforeQuitEvent();
	},

	_newMenuItem: function(status) {
		return new this._gui.MenuItem({
			type: 'checkbox',
			label: status.charAt(0).toUpperCase() + status.slice(1),
			click: $.proxy(this._setStatusEvent, this, status)
			});
	},

	_blink: function(enable) {
		if(enable) {
			if(this._blinkInterval == null) {
				this._blinkState = true;
				this._blinkInterval = setInterval($.proxy(function() {
					this._tray.icon = this._blinkState ? 'images/icon16-empty.png' : this._icon;
					this._blinkState = !this._blinkState;
				}, this), 600);
			}
		}
		else {
			if(this._blinkInterval != null) {
				clearInterval(this._blinkInterval);
				this._blinkInterval = null;
				this._tray.icon = this._icon;
			}
		}
	},

	setStatus: function(status) {

		if(this._isReady) {
			this._menuItems.online.checked = (status === 'online');
			this._menuItems.away.checked = (status === 'away');
			this._menuItems.busy.checked = (status === 'busy');

			if(status === 'online' || status === 'away' || status === 'busy')
				this._icon = 'images/icon16-' + status + '.png';
			else
				this._icon = 'images/icon16-offline.png';

			this._tray.icon = this._icon;
		}
	},

	updateOptions: function(options) {
		if(this._isReady) {
			this._win.setAlwaysOnTop(options.alwaysOnTop);
			this._popupOnNew = options.popupOnNew;

			if(this._isOptionsUnitilized) {
				this._isMinimized = options.runMinimized;
				this._isOptionsUnitilized = false;
			}
		}
	},

	onNewMessage: function() {
		if(this._isReady) {
			if(this._isMinimized) {
				if(this._popupOnNew) {
					this._onRestore();
					this._win.focus();
				}
				else {
					this._blink(true);
				}
			}
			else {
				this._win.focus();
			}
		}
	},

	onLoad: function() {
		if(this._isReady) {
			if (localStorage) {
				if(localStorage.desktopWidth && localStorage.desktopHeight) {
					this._width = parseInt(localStorage.desktopWidth);
					this._height = parseInt(localStorage.desktopHeight);
      					this._win.resizeTo(this._width, this._height);
				}
				if(localStorage.desktopX && localStorage.desktopY && localStorage.desktopX > 0 && localStorage.desktopY > 0)
	      				this._win.moveTo(parseInt(localStorage.desktopX), parseInt(localStorage.desktopY));
			}

			if(!this._isMinimized)
				this._win.show();
		}
	},

	isReady: function() {
		return this._isReady;
	}
}
