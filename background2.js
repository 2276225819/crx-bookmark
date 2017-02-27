var $$ = chrome.rumtime || chrome.extension;
$$.onMessage.addListener(function(args, sender, sendResponse) {
	if(!args.shift)return ;
	console.log(["request:",args]);
	var id = args.shift();
	var fn = args.shift();
	window[fn] && window[fn].apply(null,args).then(function(d){ 
		console.log(["response:",args]);
		$$.sendMessage({id:id,data:d}); 
	}); 
});

