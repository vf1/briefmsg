
var desktop = function () {

	var gui, win, tray, menu, menuItems;
	var width, height, isReady = false;

	this.initialize = function(setStatus, beforeQuit) {

		if(!require) return;

		gui = require('nw.gui');

		if(!gui) return;

		win = gui.Window.get();

		if(!win) return;

		var newMenuItem = function(status) {
			return new gui.MenuItem({
				type: 'checkbox',
				label: status.charAt(0).toUpperCase() + status.slice(1),
				click: function() { setStatus(status); }
				});
		}

		menuItems = { online: newMenuItem('online'), away: newMenuItem('away'), busy: newMenuItem('busy') };

		menu = new gui.Menu();
		menu.append(new gui.MenuItem({ label: 'Exit', click: function() {

				setTimeout(function() { gui.App.quit(); }, 2000);

				if(localStorage) {
					localStorage.desktopX = win.x;
					localStorage.desktopY = win.y;
					localStorage.desktopWidth  = win.width;
					localStorage.desktopHeight = win.height;
				}

				win.hide();

				tray.remove();
				tray = null;

				beforeQuit();
			} }));
		menu.append(new gui.MenuItem({ type: 'separator' }));
		menu.append(menuItems.online);
		menu.append(menuItems.away);
		menu.append(menuItems.busy);

		tray = new gui.Tray({ title: 'Brief Msg', icon: 'images/icon16-offline.png', menu: menu });

		win.on('minimize', function() {
			width = this.width;
			height = this.height;
			this.hide();
		});

		win.on('close', function() {
			this.hide();
		});

		tray.on('click', function() {
			win.show();
			win.resizeTo(width, height);
		});

		isReady = true;
	}

	this.setStatus = function(status) {

		if(isReady) {
			menuItems.online.checked = (status === 'online');
			menuItems.away.checked = (status === 'away');
			menuItems.busy.checked = (status === 'busy');

			if(status === 'online' || status === 'away' || status === 'busy')
				tray.icon = 'images/icon16-' + status + '.png';
			else
				tray.icon = 'images/icon16-offline.png';
		}
	}

	this.onLoad = function() {
		if(isReady) {
			if (localStorage && localStorage.desktopWidth && localStorage.desktopHeight) {
      				win.resizeTo(parseInt(localStorage.desktopWidth), parseInt(localStorage.desktopHeight));
      				win.moveTo(parseInt(localStorage.desktopX), parseInt(localStorage.desktopY));
			}
			
			win.show();
		}
	}
}
