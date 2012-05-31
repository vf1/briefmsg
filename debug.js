
var testContacts = [
	{ status: 'online', name: 'sip js 1', uri: 'sip:sipjs@officesip.local' },
	{ status: 'online', name: 'sip js 2', uri: 'sip:sipjs2@officesip.local' },
	{ status: 'online', name: 'Joe Doe 1', uri: 'sip:jdoe1@officesip.local' },
	{ status: 'online', name: 'Joe Doe 2', uri: 'sip:jdoe2@officesip.local' },
	{ status: 'offline', name: 'Joe Doe 3', uri: 'sip:jdoe3@officesip.local' },
	{ status: 'away', name: 'Joe Doe 4', uri: 'sip:jdoe4@officesip.local' },
	{ status: 'busy', name: 'Joe Doe 5', uri: 'sip:jdoe5@officesip.local' },
	{ status: 'online', name: 'Joe Doe 6', uri: 'sip:jdoe6@officesip.local' },
	{ status: 'online', name: 'Joe Doe 7', uri: 'sip:jdoe7@officesip.local' }];

var testMessages = [
	{ sender: 'sip:sipjs@officesip.local', time: new Date(), text: 'Hi, how are you?'},
	{ sender: 'sip:sipjs2@officesip.local', time: new Date(), text: 'Message text #2'},
	{ sender: 'sip:jdoe6@officesip.local', time: new Date(), text: 'Very long message text should be here, but I can not dream long text. What is wrong with my fantasy?'},
	{ sender: 'sip:jdoe4@officesip.local', time: new Date(), text: 'На русском языке!'}];

//saveJsonedObject('com.officesip.contacts', testContacts);
//saveJsonedObject('com.officesip.messages', testMessages);
//localStorage.clear();
//localStorage.removeItem('com.officesip.quicks');

