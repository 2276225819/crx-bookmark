chrome.extension.onMessage.addListener(function(args, sender, sendResponse) {
	//console.log(args);
	if(!args.shift)return ;
	var id = args.shift();
	var fn = args.shift();
	window[fn] && window[fn].apply(null,args).then(function(d){ 
		chrome.extension.sendMessage({id:id,data:d}); 
	}); 
});

