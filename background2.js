var $$ = chrome.rumtime || chrome.extension;
$$.onMessage.addListener(function(args, sender, sendResponse) {
	if(!args.shift)return ;
	console.log(args);
	var id = args.shift();
	var fn = args.shift();
	window[fn] && window[fn].apply(null,args).then(function(d){ 
		$$.sendMessage({id:id,data:d}); 
	}); 
});

