//_exlog("pageload");   edge/contentScriptsAPIBridge.js
$(function(){  
    var $ul = $('#list').html('正在登陆,请不要关闭窗口...'); 
    _exLoginLive(function(data,user){    
        console.log(user); 
        $('#tool>span').html(user.name); 
        success($ul,data);  
    });    
});  
window.onerror=function(e){  
    _exlog(e);
};

function _exlog(str){  
    chrome.extension.sendMessage({"write":str}); 
}
function _exLoginLive(cb){   
    chrome.extension.sendMessage({"login":"true"},function(data){
        cb(data[0],data[1]);
    }); 
} 

function success($ul,data){
    $ul.html('正在加载目录..');
    var d = new OneDriver(data.access_token);    
    d.favorites(function(list,src){ 
        $('#tool>button').attr('data-add',src); 
        render($ul,list,d);  
    });  

    
    $(document).unbind()
    .on('click','#tool>a',function(){
        chrome.tabs.create({url:'https://onedrive.live.com/',selected:true}); 
    })
    .on('click','#tool>i', function(){ 
        delete localStorage['data'] ;
        delete localStorage['code'] ;
    })
    .on('click','[data-file]',function(){
        var src = $(this).data('file');  
        chrome.tabs.create({url:src,selected:true});
        return false;
    })
    .on('click','[data-folder]',function(){ 
        var src = $(this).data('folder'); 
        var $u = $(this).find('+ul');
        if($u.html()) return $u.html("");
        $('<li>加载中...</li>').attr('style','opacity:0.3').appendTo($u);
        d.goto(src,function(list){  
            render($u,list,d);  
        });
        return false; 
    }) 
    .on('click','[data-add]',function(){ 
        var src = $(this).data('add');
        var $u = $(this).parent().find('>ul');  
        chrome.tabs.query( {'active':true,'lastFocusedWindow': true}, function(tabs) {
        //chrome.tabs.getSelected(function(tabs){    
            var url = tabs[0].url; 
            var title = tabs[0].title;//window.prompt("添加新书签："+url,tabs.title);//EdgeEX不支持 
            if(title) {
                $('<li>加载中...</li>').attr('style','opacity:0.3').appendTo($u);
                d.add(src,title,url,function(){   
                    d.goto(src,function(list){  
                        render($u,list,d);  
                    });
                });   
            }
        });  
        return false;
    })
    .on('click','[data-del]',function(){ 
        var $this = $(this).parent().attr('style','opacity:0.3');
        var src = $(this).data('del'); 
        d.del(src,function(data,dir){  
            $this.remove();
        });   
    })
}
function render($ul,data,d){  
    $ul.empty();
    for(var k in data) with({ item:data[k], $li:$('<li></li>').appendTo($ul)   }) {   
        if(item.type=='folder'){ 
            $li.attr('class',item.type).append('<ul></ul>'); 
            $('<div>'+item.name+'</div>').prependTo($li)
                .attr('data-folder',item.upload_location);
            $('<button class="add" title="添加新书签"></button>').prependTo($li)
                .attr('data-add',item.upload_location); 
        }      
        if(item.type=='file'){ 
            var name = item.name.replace(/\.url$/,'');
            var $del = $('<button class="del" title="删除书签"></button>').prependTo($li)
            $li.append('<div>'+ name +'</div>');  
            d.load(item.upload_location,function(html){
                var arr = html.match(/URL=([^\n]*)/);
                $del.attr('data-del',item.upload_location); 
                $li.attr('class',item.type)
                    .find('>div') .attr('data-file', arr[1] );  
            });   
        } 
    } 
} 

function OneDriver(token){
    var _base='';
    var _this = this;
    _this.token=token;
    _this.favorites=function T(cb){     
        if(localStorage['favorites']) 
            success( JSON.parse(localStorage['favorites']) );  
        if(!T['favorites']){
            T['favorites']=true;
            $.get("https://apis.live.net/v5.0/me/skydrive?access_token="+token,function(json){
                var base_url = json.upload_location;
                $.get(base_url+"?access_token="+token,function(json){  
                    localStorage['favorites_url'] = base_url;
                    if(!localStorage['favorites']) success(json);
                    localStorage['favorites'] = JSON.stringify(json); 

                    setTimeout(function(){
                        T['favorites']=false;
                    },60*1000); 

                });
            });
        }
        function success(json){ 
            console.log(json);
            for(var k in json.data){
                var item = json.data[k];
                if(item.name=='favorites')
                    return _this.goto(item.upload_location,cb);
            } 
            //alert('error');  return; 
            $.ajax({
                url:localStorage['favorites_url'].toString().replace(/\/files\/$/,'') , 
                type:'POST', 
                headers:{ "Authorization":"Bearer "+token,'Content-Type': 'application/json' },
                data: '{"name":"favorites"}',
                success:function(json){
                    return _this.goto(json.upload_location ,cb);
                }
            })  
        };
    } 
    _this.goto=function T(upload_location,cb){  
        _base = upload_location;  
        if(localStorage[upload_location]) 
            cb(JSON.parse(localStorage[upload_location]),upload_location); 
 
        if(!T[upload_location]){
            T[upload_location]=true;
            $.ajax({ 
                url: upload_location+"?access_token="+token,
                success:function(json){
                    if(!localStorage[upload_location]) cb(json.data,upload_location);
                    localStorage[upload_location] = JSON.stringify(json.data);
                    setTimeout(function(){
                        T[upload_location]=false;
                    },60*1000); 
                },
                error:function(e){  
                    _exlog(e);
                    //_this._clear();  
                    //cb({},upload_location);
                }
            });  
        }
    }
    _this.load=function T(upload_location,cb){
        if(localStorage[upload_location]) 
            cb(JSON.parse(localStorage[upload_location]));
 
        if(!T[upload_location]){
            T[upload_location]=true;
            $.get(upload_location+'?access_token='+token,function(data){
                if(!localStorage[upload_location])  cb( data );
                localStorage[upload_location] = JSON.stringify(data);
                setTimeout(function(){
                    T[upload_location]=false;
                },60*1000); 
            });
        }
    }
    _this.add=function(upload_location, name, url,success ){
        var file = name+'.url'; 
        [/\\\\/g, /\//g, /:/g, /;/g, /\*/g, /</g, />/g, /\|/g, /\?/g].forEach(function(v){
            file = file.replace(v,'');
        }); 
        var text = 'URL='+url; 
        $.ajax({
            url: upload_location +'?access_token='+ token,
            type:'POST',
            contentType : 'multipart/form-data; boundary=EEEEEEEEEEEEEEEEEEEE',
            processData : false,  
            data:'--EEEEEEEEEEEEEEEEEEEE\r\nContent-Disposition: form-data; name="file"; filename="'+file+'"\r\nContent-Type: application/octet-stream\r\n\r\n[InternetShortcut]\r\n'+text+'\r\nRoamed=-1\r\n--EEEEEEEEEEEEEEEEEEEE--',
            success:function(data){ 
                _this._clear(upload_location);
                success(data);
            },
            error:function(e){
                _exlog(e); 
                success({}); 
            }
        }); 
    }
    _this.del=function(upload_location,success){
        var url = upload_location.replace(/\/content\/$/,'');
          $.ajax({
            url: url +'?access_token='+ token,
            type:'DELETE',    
            success:function(data){ 
                _this._clear(upload_location);
                success(data);
            },
            error:function(e){
                _exlog(e); 
                success({}); 
            }
         }); 
    }
    _this._clear=function(upload_location){ 
        _exlog("CLEAR!!!"+upload_location);
        delete localStorage['favorites'];
        for(var k in localStorage) {
            if(k.search("https:")<0)continue;
            delete localStorage[k];
        }  
        for(var k in this.load) {
            if(k.search("https:")<0)continue;
            delete this.load[k];
        } 
        for(var k in this.goto) {
            if(k.search("https:")<0)continue;
            delete this.goto[k];
        } 
    }
} 