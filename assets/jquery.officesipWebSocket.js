/**
 * WebSocket with graceful degradation - jQuery plugin
 * base on David Lindkvist gracefulWebSocket.js
 * 
 * @author Vitali Fomine
 * @version 0.2
 * 
 * Create an object implementing the WebSocket API for OfficeSIP Server.
 * 
 * Protocol Diagrams:
 * 
 *   1. Connect and long polling
 * 
 *                 [CLIENT]                          [SERVER]
 *                    |                                 |
 *        GET /ajax.websocket?id=0 -------------------> |
 *                    | <------------------ 200 OK + {new id (5) in body}
 *        GET /ajax.websocket?id=5 -------------------> |
 *                    .                                 .
 *                    .            20 seconds           .
 *                    .                                 .
 *                    | <------ 200 OK + data when ready or empty after 20 seconds
 *                    | ------------------------------> |
 *                    .                                 .
 *                    .            20 seconds           .
 *                    .                                 .
 *                    | <------ 200 OK + data when ready or empty after 20 seconds
 *                    .                                 .
 * 
 * 
 *   2. Send data
 * 
 *                 [CLIENT]                          [SERVER]
 *                    |                                 |
 *  POST /ajax.websocket?id=5 + {data in body} -------> |
 *                    | <--------------------------- 200 OK
 *                    .                                 .
 *                    .                                 .
 *                    .                                 .
 *  POST /ajax.websocket?id=5 + {data in body} -------> |
 *                    | <--------------------------- 200 OK
 *                    .                                 .
 * 
 */

(function ($) {

	if(typeof WebSocket === 'undefined') {
	
		WebSocket = function(url, options) {
		
			this.defaults = {
				fallbackURL: url.replace('ws:', 'http:').replace('wss:', 'https:') + ((url.substr(-1) === '/') ? '' : '/') + 'ajax.websocket',
				fallbackPollParams: {}
			};
			
			var opts = $.extend({}, this.defaults, options);
			
			// Creates a fallback object implementing the WebSocket interface
			function FallbackSocket() {
				
				// WebSocket interface constants
				const CONNECTING = 0;
				const OPEN = 1;
				const CLOSING = 2;
				const CLOSED = 3;
				
				var openTimout;
				var id = 0;
				
				// create WebSocket object
				var fws = {
					readyState: CONNECTING,
					bufferedAmount: 0,
					send: function (data) {
						if(this.readyState != OPEN)
						{
							$(fws).triggerHandler('error');
						}
						else
						{
							$.ajax({
								type: 'POST',
								url: opts.fallbackURL + '?' + $.param( getFallbackParams() ),
								data: data,
								dataType: 'text',
								contentType : "application/x-www-form-urlencoded;charset=utf-8",
								error: function (xhr) {
									$(fws).triggerHandler('error');
								}
							});
						}
					},
					close: function () {
						id = 0;
						clearTimeout(openTimout);
						this.readyState = CLOSED;
						$(fws).triggerHandler('close');
					},
					onopen: function () {},
					onmessage: function () {},
					onerror: function () {},
					onclose: function () {},
				};
				
				function getFallbackParams() {
				
					return $.extend({"id": id, "rand": new Date().getTime()}, opts.fallbackPollParams);
				}
				
				function pollSuccess(data) {
					
					if(fws.readyState == CONNECTING) {
						
						var newId = parseInt(data);
						
						if(isNaN(newId)) {
						
							fws.readyState = CLOSED;
							$(fws).triggerHandler('error');
						}
						else {

							id = newId;
							fws.readyState = OPEN;
							$(fws).triggerHandler('open');
						}
					}
					else if(fws.readyState == OPEN) {
					
						if(data.length > 0) {
						
							var messageEvent = {"data" : data};
							fws.onmessage(messageEvent);
						}
					}
				
					if(fws.readyState == OPEN)
						poll();
				}
				
				function poll() {
					
					$.ajax({
						type: 'GET',
						url: opts.fallbackURL,
						dataType: 'text',
						data: getFallbackParams(),
						success: pollSuccess,
						error: function (xhr) {
							$(fws).triggerHandler('error');
						}
					});		
				}
				
				poll();
				
				return fws;
			}
			
			var ws = new FallbackSocket();
	 		$(window).unload(function () { ws.close(); ws = null });
			return ws;
		}
	}
	
})(jQuery);