 
$(function(){ 
	var $ul = $('#list');  
	getCacheAsync('skydriver').then(function(arr){
		if(arr) render($ul,arr);    
		else getFavoritesAsync().then(function(arr){
			setCacheAsync('skydriver',arr); 
			render($ul,arr);  
		}); 
	},function(error){ 
		console.log(error);
	}); 

	$(document)
    .on('click','#tool>a',function(){
        chrome.tabs.create({url:'https://onedrive.live.com/',selected:true}); 
    })
    .on('click','[data-file]',function(){
        var src = $(this).data('file');  
        chrome.tabs.create({url:src,selected:true});
        return false;
    })
	.on('mouseover','li.black',function(){
		var $this = $(this);
		var url = $this.removeClass('black').attr('url');
		getFileInfoAsync(url).then(function(html){  
            var $del = $('<button class="del" title="删除书签"></button>').prependTo($this)
			$del.attr('data-del',url); 
			$this.attr('class','file').removeAttr('url')
				.find('>div') .attr('data-file', html );  
		}); 
		return false;
	})	
    .on('click','[folder]',function(){ 
        var url = $(this).attr('folder'); 
        var $u = $(this).find('+ul');
        if($u.html()) return $u.html("");
        $('<li>加载中...</li>').attr('style','opacity:0.3').appendTo($u);
		getFilesAsync(url).then(function(list){
            render($u,list);  
		});
        return false; 
    }) 
});

function render($ul,data){  
    $ul.empty();
    for(var k in data) with({ item:data[k], $li:$('<li></li>').appendTo($ul)   }) {   
        if(item.type=='folder'){ 
            $li.attr('class',item.type).append('<ul></ul>'); 
            $('<div>'+item.name+'</div>').prependTo($li)
                .attr('folder',item.upload_location);
            $('<button class="add" title="添加新书签"></button>').prependTo($li)
                .attr('data-add',item.upload_location); 
        }      
        if(item.type=='file'){ 
            var name = item.name.replace(/\.url$/,'');
            $li.attr('url',item.upload_location)
				.attr('class','black')
				.append('<div>'+ name +'</div>');
			 
        } 
    } 
} 
 
function autoCache(name,fn){
	return getCacheAsync(name).then(function(data){
		return data || fn().then(function(data){
			return setCacheAsync(name,data);
		})
	}).catch(function(e){
		localStorage['token']='';
		console.log(e.stack);
	})
}
function getCacheAsync(name){
	var global = this;// (0,eval)('this');
	return new Promise(function(next,err){ 
		if(global.localStorage){
			var str = localStorage[name];
			next(str && JSON.parse(str)); 
		}else{
			err("");
		}
	}) 
}
function setCacheAsync(name,val){ 
	var global = this;//(0,eval)('this');
	return new Promise(function(next,err){
		if(global.localStorage){
			if(val)localStorage[name] = JSON.stringify(val);
			next(val); 
		}else{
			err("");
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
            success: function(data){
				next(data.access_token); 
            },
            error:err
        });  
	})
}
function loadUserAsync(token){ 
	return new Promise(function(next,error){
 		$.ajax('https://apis.live.net/v5.0/me?access_token='+token).then( function(user){
				next(user); 
        }, error); 
	});
}
function saveFileAsync(){

}
function loadFilesAsync(token,upload_location){ 
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
function getFavoritesAsync(){   
	return getTokenAsync().then(function(token){ 
		return new Promise(function(next,error){
			var url ="https://apis.live.net/v5.0/me/skydrive?access_token="+ token; 
			$.ajax(url).then(next,error); 
		}).then(function(json){
			var base_url = json.upload_location;
			return loadFilesAsync(token,base_url) .then(function(files){  
				for(var k in files) with({item:files[k]})
					if(item.name=='favorites') 
						return item.upload_location;   
				//dir is not exists
				var fdir = base_url.replace(/\/files\/$/,'');
				return createDirAsync(token,fdir,'favorites').then(function(json){
					return json.upload_location;  
				}); 
			})
		}).then(function(favorites_location){
			return loadFilesAsync(token,favorites_location);
		})
	});
}


function getTokenAsync(){ 
	return autoCache('token',function(){
		return loginAsync().then(function(code){
			return createTokenAsync(code);
		}) 
	})
}
function getFileInfoAsync(upload_location){ 
	return autoCache(upload_location,function(){
		return getTokenAsync().then(function(token){
			return loadContentAsync(token,upload_location);
		}) 
	}); 
}
function getFilesAsync(upload_location){ 
	return autoCache(upload_location,function(){
		return getTokenAsync().then(function(token){
			return loadFilesAsync(token,upload_location);
		}) 
	}); 
}