chrome.extension.onMessage.addListener(function(args, sender, sendResponse) {
    if(args.write)console.log(args.write);
    if(args.login)oauth.getToken(function(a,b){
        sendResponse([a,b]);
    });  
});


function loginAsync(){ 
	function getParam(name,path){ 
		var reg = new RegExp("(^|\\\?|&)"+ name +"=([^&]*)(&|$)");
		var r = (path||window.location.search).substr(1).match(reg);
		if(r!=null)return  unescape(r[2]); return null;
	}
	function getOAuthURL(){  
		var appid = '5488e2a9-2c68-4185-9b04-b5218dcad5c1';
		var scope = 'wl.skydrive wl.skydrive_update wl.signin wl.basic';
        return 'https://login.live.com/oauth20_authorize.srf'
                +'?client_id='+appid
                +'&scope='+scope
                +'&response_type='+'code'   
    }; 
	var url = getOAuthURL(); 
	return new Promise(function(next){
		chrome.windows.create({  url:url, type:'popup',width:400,height:600,top:0 },function(win){   
			chrome.windows.update(win.id,{focused:true});  
			var tabid = win.tabs[0].id; 
			setTimeout(function T(){  
				chrome.tabs.get(tabid,function(d){
					if(!d) return;
					var code = getParam('code',d.url);
					if(!code)return setTimeout(T,1000);  
					chrome.tabs.remove(tabid);
					next(code);  
				}) 
			},1000);
		});
	});
	// return new Promise(function(next){  
	// 	var win = window.open(url,'_newTable','width=1,height=1');
	// 	new function T(){ 
	// 		if(!win.location)return;
	// 		var code = getParam('code',win.location.toString());
	// 		if(!code)return setTimeout(T,1000); 
	// 		setTimeout(function(){
	// 			win.close();
	// 		},100);
	// 		return next(code);
	// 	} 
	// }) 
} 