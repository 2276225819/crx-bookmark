chrome.extension.onMessage.addListener(function(args, sender, sendResponse) {
	if(!args.shift)return ;
	var id = args.shift();
	var fn = args.shift();
	window[fn] && window[fn].apply(null,args).then(function(d){ 
		chrome.extension.sendMessage({id:id,data:d}); 
	}); 
});
 
function autoCache(name,fn){
	return getCacheAsync(name).then(function(data){
		return data || fn().then(function(data){
			return setCacheAsync(name,data);
		})
	}) 
}
function getCacheAsync(name){ 
	return new Promise(function(next,err){  
		var str;
		try {
			str = localStorage[name];
			next(str && JSON.parse(str));    
		} catch (error) {
			delete localStorage[name];
			console.log([error,name,str]);
			alert(str);  
			err(error); 
		}
	}) 
}
function setCacheAsync(name,val){  
	return new Promise(function(next,err){
		try {
			if(val=='') delete localStorage[name];
			else localStorage[name] = JSON.stringify(val); 
			next(val);   
		} catch (error) {
			console.log([error,name,val]);
			alert(str);  
			err(error);
		} 
	}) 
}


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
function queryNowTabAsync(){ 
	return new Promise(function(next){
		chrome.tabs.query( {'active':true,'lastFocusedWindow': true}, function(tabs){
			if(tabs && tabs[0] && tabs[0].title)
				next(tabs[0]);
		});  
		chrome.tabs.query( {'active':true}, function(tabs){
			if(tabs && tabs[0] && tabs[0].title)
				next(tabs[0]);
		});   
	}).then(function(tab){
		return ({
			url:tab.url,
			title:tab.title//window.prompt("添加新书签："+url,tabs.title);//EdgeEX不支持 
		}); 
	});
}
function createTokenAsync(code){
	var url = 'https://login.live.com/oauth20_token.srf';
	var appid = '5488e2a9-2c68-4185-9b04-b5218dcad5c1';
	var secret = 'B6vPLrYY2xZ6qhzqpCdhnH2';
	var scope = 'wl.skydrive wl.skydrive_update wl.signin wl.basic'; 
	return new Promise(function(next,err){
		$.ajax({
            url:url,  
            type:"POST",
            data:{
                client_id:appid,   client_secret:secret,
                code:code,  grant_type:'authorization_code'
            },
            contentType:"application/x-www-form-urlencoded",
            dataType:"json", 
        }).then(function(data){
			next(data.access_token); 
		},err);
	})
}
function loadUserAsync(token){ 
	return new Promise(function(next,error){
 		$.ajax('https://apis.live.net/v5.0/me?access_token='+token).then(next,error); 
	});
}
function removeFileAsync(token,upload_location){
	upload_location = upload_location.replace(/\/content\/$/,'');
	return new Promise(function(next,error){ 
		$.ajax({
			url: upload_location +'?access_token='+ token,
			type:'DELETE',
			success:next,error:error,
		}) 
	}).then(function(data){
		setCacheAsync(upload_location,'');
		return data;
	})
 
}
function saveFileAsync(token,upload_location,name,url){ 
	var file = name +'.url'; 
	[/\\\\/g, /\//g, /:/g, /;/g, /\*/g, /</g, />/g, /\|/g, /\?/g].forEach(function(v){
		file = file.replace(v,'');
	}); 
	var text = 'URL='+url; 
	return $.ajax({
		url: upload_location +'?access_token='+ token,
		type:'POST',
		contentType : 'multipart/form-data; boundary=EEEEEEEEEEEEEEEEEEEE',
		processData : false,  
		data:'--EEEEEEEEEEEEEEEEEEEE\r\nContent-Disposition: form-data; name="file"; filename="'+file
			+'"\r\nContent-Type: application/octet-stream\r\n\r\n[InternetShortcut]\r\n'+text
			+'\r\nRoamed=-1\r\n--EEEEEEEEEEEEEEEEEEEE--',
	}).then(function(data){
		setCacheAsync(upload_location,'');
		return data;
	});
}
function loadFileListAsync(token,upload_location){ 
	return new Promise(function(next,error){
		$.ajax(upload_location+"?access_token="+token).then(next,error); 
	}).then(function(json){
		return json.data;
	})
}
function loadContentAsync(token,upload_location){
	return new Promise(function(next,error){
		$.ajax(upload_location+"?access_token="+token).then(next,error); 
	}).then(function(html){
		return html.match(/URL=([^\n]*)/)[1];
	})
}
function saveDirAsync(token,base_dir,name){
	return new Promise(function(next,error){ 
		$.ajax({
			url:base_dir ,type:'POST', 
			headers:{ "Authorization":"Bearer "+token,'Content-Type': 'application/json' },
			data: '{"name":"'+name+'"}',
			error:error,
			success:next,
		})  
	})
}
function loadFavoritesAsync(){   
	return tryTokenAsync(function(token){
		return new Promise(function(next,error){
			var url ="https://apis.live.net/v5.0/me/skydrive?access_token="+ token; 
			$.ajax(url).then(next,error); 
		}).then(function(json){
			var base_url = json.upload_location;
			return loadFileListAsync(token,base_url).then(function(files){  
				for(var k in files) with({item:files[k]})
					if(item.name=='favorites') 
						return item.upload_location;   
				//dir is not exists
				var fdir = base_url.replace(/\/files\/$/,'');
				return createDirAsync(token,fdir,'favorites').then(function(json){
					return json.upload_location;  
				}); 
			})
		}) 
	});
}

function tryTokenAsync(cb){ 
	return autoCache('token',function(){
		return loginAsync().then(function(code){
			return createTokenAsync(code);
		}) 
	})
	.then(cb)
	.catch(function(e){ 
		setCacheAsync('token',''); 
		alert('token error:'+(e.stack ||e.status)+ e.statusText); 
	})
} 
function addFileAsync(upload_location,file,url){ 
	return tryTokenAsync(function(token){
		return saveFileAsync(token,upload_location,file,url); 
	}); 
}
function delFileAsync(upload_location){  
	return tryTokenAsync(function(token){
		return removeFileAsync(token,upload_location);
	})  
}
function getFileAsync(upload_location){ 
	return autoCache(upload_location,function(){
		return tryTokenAsync(function(token){
			return loadContentAsync(token,upload_location);
		}) 
	}); 
}
function getFileListAsync(upload_location){ 
	return autoCache(upload_location,function(){
		return tryTokenAsync(function(token){
			return loadFileListAsync(token,upload_location);
		}) 
	}); 
}
function getFavoritesUrlAsync(){ 
	return getCacheAsync('skydriver').then(function(favorites_location){ 
		return favorites_location || loadFavoritesAsync().then(function(favorites_location){
			setCacheAsync('skydriver',favorites_location);
			return favorites_location;
		});
	});
}