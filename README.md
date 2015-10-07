# Ajax(Asynchronous JavaScript and XML)
一种使用脚本操作HTTP请求的技术。在客户端与服务器进行数据交互时不会导致页面刷新。

## 实现方式
1. 使用img、iframe、script
    HTML文档中的这些标签都会发起HTTP请求来获取相应的WEB资源。所以我们可以通过脚本创建这些标签并设置src属性来发起HTTP请求。
    * 这种方式发起的请求都是GET请求。
    * 常用img来做数据收集。
    * script可以跨域请求(jsonp)。
    
2. XMLHttpRequest
    浏览器客户端实现的一个用于操作HTTP请求的对象。

## XMLHttpRequest

### 创建方式

标准方式
```javascript
var xhr = new XMLHttpRequest();
```
IE7以下
```javascript
var xhr = new ActiveXObject('Microsoft.XMLHTTP');
```

### 初始化请求
```javascript
xhr.open(method, url, [async], [user], [password]);
```

- 请求方法
    * GET
    * POST
    * HEAD、DELETE、PUT、OPTIONS
    * CONNECT、TRACE 比较危险

- async 默认是true，表示是否执行异步请求

### 设置请求头
```javascript
xhr.setRequestHeader(header, value);
```

### 发送
```javascript
xhr.send(data);
```