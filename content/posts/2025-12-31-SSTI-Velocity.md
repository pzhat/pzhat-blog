---
date: 2026-04-10T00:00:00+07:00
title: Velocity Server Side Template Injection Challenge
categories: [pentesting, Web-Exploitation, CTF]
tags: [Web]
---

# Velocity Server Side Template Injection Challenge

### Tổng quan về lab Velocity SSTI

Đây là một lab mình thiết kế ra để demo và học về SSTI. Bên trong lab được chia ra làm `4 level` với các lớp filter khác nhau. Nhiệm vụ của mình là `bypass` được các lớp bảo mật đó nhằm mục đích cuối cùng là `RCE`. Bây giờ mình sẽ đi vào phân tích chức năng của web app.

### Phân tích Web Application

![image](https://hackmd.io/_uploads/SkFu6beNbg.png)

Đi vào đầu tiên là giao diện của web, vì là lab mô phỏng nên mình chỉ làm đơn giản. Nó bao gồm `form` để mình nhập tên vào và một nơi để chọn level, theo đó là có một nút `render` để xử lý `user input`.

![image](https://hackmd.io/_uploads/SyzZ0-lVbg.png)

Đây là kết quả sau khi mình nhập tên mình sau đó thực hiện render.

Vậy với phần giao diện đơn giản như vậy thì phía sau nó xử lý những gì? Bây giờ mình sẽ phân tích phía back end.

### Back-End Breakdown

```text 
ssti-velocity-lab/
│
├── pom.xml
│
└── src/
    └── main/
        ├── java/
        │   └── com/
        │       └── lab/
        │           └── ssti/
        │
        │               ├── SstiVelocityLabApplication.java
        │               │
        │               ├── controller/
        │               │   └── SSTIController.java
        │               │
        │               ├── service/
        │               │   └── SSTIService.java
        │               │
        │               ├── filter/
        │               │   └── SSTIFilter.java
        │               │
        │               └── config/
        │                   └── VelocityConfig.java
        │
        └── resources/
            └── application.properties

```

Ở trên là cấu trúc của project hiện tại, mình sử dụng Spring Boot để tạo nên và để tạo ra Vuln mình dùng Velocity Template. Bây giờ mình sẽ phân tích từng đoạn code.

![VelocityConfig.java](https://hackmd.io/_uploads/H167fGlVWl.png)

Đoạn code Java trên là một lớp cấu hình Spring `(@Configuration)` để khởi tạo `VelocityEngine` (một template engine dùng để tạo văn bản động).

Ở lớp cấu hình này mình đã có sửa một chút ở vài đoạn. Cụ thể là ở 2 dòng sau : 

```java 
props.setProperty("introspection.restrict.methods", "");
props.setProperty("introspection.restrict.classes", "");
```

Theo mặc định, `Velocity` chặn truy cập vào các lớp nhạy cảm như `java.lang.Class`, `java.lang.Runtime`, hay `java.lang.System` để tránh thực thi từ xa. Bằng cách đặt chúng thành rỗng, mình đã vô hiệu hóa hoàn toàn cơ chế bảo vệ, cho phép template truy cập vào bất kỳ lớp Java nào có trong classpath.

Vậy là mình đã mở đường cho các lớp để có thể thực hiện `RCE`, lý do là vì ở bản mới của `Velocity` nó đã chặn lại hết và khá `secure`, nó làm cho bước RCE trở nên khó nên bắt buộc mình phải mở ra.

Tham khảo thêm tại : <https://github.com/VISTALL/apache.velocity-engine/blob/master/velocity-engine-core/src/main/java/org/apache/velocity/util/introspection/SecureUberspector.java>

![SSTIController.java](https://hackmd.io/_uploads/rJO3phlE-e.png)

Tại `SSTIController.java`, đây là nơi mà mình xử lý user input. Có thể thấy rõ rằng ở đoạn : 

```java 
String template = "Hello " + name;
```

`User Input` được nối chuỗi trực tiếp vào `template` và chính nơi này là nơi chứa lỗ hổng `SSTI` vì khi mình truyền tham số name, `Velocity` sẽ coi mọi ký tự trong name là chỉ thị lệnh `(directives)` để thực thi chứ không phải là văn bản thuần túy `(plain text)`.

![SSTIFilter.java](https://hackmd.io/_uploads/H1IzxMWE-e.png)

Các lớp filter tương ứng với từng level sẽ được xử lý tại `SSTIFilter.java` ở bên trên mình sẽ phân tích filter khi tiến hành exploit ở sau.

Phân `back-end` cũng chỉ có vài đoạn code nhỏ như vậy, bên cạnh các đoạn code quan trọng mình đã nói đến thì còn có hàm `main`, `file html` để tạo UI nhưng không cần thiết phân tích tránh dài dòng.

### Exploit và POC chi tiết

#### Level 0 : 

![image](https://hackmd.io/_uploads/r1_qcfe4Zg.png)

Level đầu tiên mình để là `level 0` và ở level này mình sẽ không cài một lớp bảo mật nào. Bây giờ mình sẽ thử với việc kiểm tra liệu `template` có xử lý `user input` đúng như mong đợi không.

![image](https://hackmd.io/_uploads/BJoJhMg4-x.png)

Ở tại form nhập tên mình tiến hành inject vào đoạn : 

```java 
#set($x=7*7)$x
```
![image](https://hackmd.io/_uploads/r11BnMgNWl.png)

Và kết quả trả về cho mình là giá trị sau khi phép tính được thực hiện.

Tại đây payload để test khá đơn giản, nó đơn giản là tiến hành set một biến `x` có chứa phép tính sau đó in lại biến `x` ra. Chính nhờ vào câu lệnh đơn giản như vậy lại giúp ta xác nhận được rằng `template engine` có xử lý user input.

Với level 0 không có lớp phòng thủ nào, mình hoàn toàn có thể viết một payload sử dụng java runtime để RCE.

![image](https://hackmd.io/_uploads/rkA0TMeNZg.png)

Mình sử dụng lớp runtime để exec lên calc.exe, payload như sau : 

```java 
#set($str = "anyString") #set($runtime = $str.getClass().forName("java.lang.Runtime").getRuntime()) $runtime.exec("calc.exe")
```

Payload này lợi dụng kỹ thuật `Java Reflection` để từ một đối tượng bình thường leo thang lên quyền thực thi lệnh hệ thống. Từ đây mình thành công RCE.

#### Level 1 : 

![image](https://hackmd.io/_uploads/SkqNgfbNbx.png)

Đến với level 1, mình để ý rằng bây giờ user input đã có một lớp filter bảo mật, cụ thể là ở đoạn sau : 

```java 
 private static String level1(String s) {
  return s.replace("$", "");
}
```

Ở đây mình sử dụng `replace` để xoá đi kí tự `$` khi nó xuất hiện trong user input cụ thể ở đây là biến `name`.

![image](https://hackmd.io/_uploads/HJS9apxV-x.png)

Để kiểm chứng rằng filter có hoạt động thì ở tại input level 1 mình sẽ nhập vào `$`.

![image](https://hackmd.io/_uploads/ryV6Tax4Zx.png)

Kết quả trả về đúng như mong đợi rằng dấu `$` đã bị replace thành chuỗi rỗng, bây giờ mình sẽ phải tìm được hướng bypass để có thể RCE level này.

Sau khi tìm kiếm thử vài cách bypass thì mình tìm ra được 1 cách bypass thành công.

![image](https://hackmd.io/_uploads/HJjXLCeNbg.png)

Ở đây mình sử dụng một kĩ thuật đó là dùng `Unicode Escape` để bypass cụ thể payload như sau : 

```java 
#evaluate("#set(\u0024x+=+7*7)\u0024x")
```

- Sau khi inject payload trên, java bắt đầu kiểm tra chuỗi đầu vào nhưng ở trong payload không hề có dấu `$` nên thành công đi qua lớp filter.
- Tớ velocity template xử lý, nó bắt đầu xử lý nội dung bên trong dấu ngoặc kép.
- Velocity tiến hành thông dịch `\u0024` thành kí tự `$`. Lúc này thứ mà Velocity Template xử lý là `#set($x = 7*7)$x`.
- Cuối cùng, hàm `evaluate` được thực thi đoạn được encode đó và kết quả trả về 49.

Bây giờ, mình đã thành công bypass cơ chế bảo vệ của level 1. Tiến hành sửa payload và RCE.

![image](https://hackmd.io/_uploads/ByiE_AeEbg.png)

Thành công gọi lớp `runtime exec` và chạy lên `calc.exe` bằng payload : 

```java 
#evaluate("#set(\u0024str='any') #set(\u0024run=\u0024str.getClass().forName('java.lang.Runtime').getRuntime()) \u0024run.exec('calc.exe')")
```

#### Level 2 : 

![image](https://hackmd.io/_uploads/rJWLezW4-x.png)

Đến với level 2, sau khi truy cập `SSTIFilter.java` mình thấy được lớp bảo vệ của level này. Cụ thể là lớp filter này sẽ xử lý user input, nếu trong input có chuỗi `#set` thì lập tức sẽ bị replace về rỗng.

![image](https://hackmd.io/_uploads/Bk8sgM-E-x.png)

Mình sẽ thử inject payload cũ trong đó tồn tại chuỗi `#set`.

![image](https://hackmd.io/_uploads/B1dCef-Vbg.png)

Sau khi render, đúng như dự đoán, kết quả trả về chỉ có mỗi đoạn `($x=7*7)$x` và phần `#set` đã trở thành rỗng. Với lớp filter này thì các payload trước không còn hiệu quả nữa.

Trong trường hợp này, directive `#set` đã bị chặn nhưng sau khi tham khảo ở trong document, mình để ý rằng ngoài `#set` ra thì còn nhiều directive khác có thể lợi dụng nữa.

![image](https://hackmd.io/_uploads/SyPfffW4-x.png)

Tham khảo tại : <https://velocity.apache.org/engine/2.0/configuration.html#set-directive>

Nhưng ở đây có một vấn đề là nếu sử dụng các `directive` khác thì không thể `RCE` được. Lý do là vì thiếu `#set` thì không còn `directive` nào có thể gán biến. Điều đó làm cho việc `RCE` rất khó.

Ở đây để ý kĩ rằng ở lớp `filter`, nó chỉ chặn chuỗi `#set`. Nếu nó chặn từng kí tự như chặn `#` với `set` thì khó `bypass`, vấn đề là nó chỉ biến chuỗi `#set` thành rỗng. Nên mình nghĩ ra một ý là lợi dụng unicode encode ở trước `set` thì có khả năng phá vỡ được logic của blacklist.

Payload để thử sẽ có dạng : 

```java 
#evaluate("\u0023set($x=7*7)$x")
```

Thay vì dùng `#set` đã bị block thì mình dùng `\u0023set` vẫn có khả năng nó được template parse.

![image](https://hackmd.io/_uploads/SkECNNbEbx.png)

![image](https://hackmd.io/_uploads/rJtySVWE-g.png)

Vậy là ý tưởng đã đúng bây giờ mình tiến hành `RCE`.

![image](https://hackmd.io/_uploads/BybNrEb4We.png)

Với payload : 

```java 
#evaluate("\u0023set($str='any') \u0023set($run=$str.getClass().forName('java.lang.Runtime').getRuntime()) $run.exec('calc.exe')")
```

Thành công sử dụng lớp `runtime exec` chạy lên `calc.exe`.

#### Level 3

![image](https://hackmd.io/_uploads/Hyyw-_WEWg.png)

Ta có đoạn code xử lý filter ở level 3, ở đây như đã thấy, các keywords đã bị filter lại, bên cạnh đó nó còn sử dụng regex `(?i)` có nghĩa là bất kể là viết hoa hay không đều sẽ dính.

Vấn đề ở level này là phải tìm cách bypass để gọi được các lớp nguy hiểm nhằm RCE. Sau một lúc research và thử các phương pháp như lồng chuỗi, encode,... có vẻ như template engine không xử lý được hết nên hầu như muốn RCE là không thể. Nên ở level này mình sẽ không RCE mà thay vào đó tìm các hướng tấn công khác.

![image](https://hackmd.io/_uploads/rk2luGM4Zg.png)

Ngoài RCE, SSTI còn có các impact khác như là `Data Exposure`, `XSS`, `Deface`, `Dos`, `Leo thang đặc quyền`. 

![image](https://hackmd.io/_uploads/BJ_-nGfE-x.png)

![image](https://hackmd.io/_uploads/rkfMnMzEWg.png)

Tại level 3 sau khi thử chạy phép tính, mình chắc chắn rằng template vẫn xử lý user input. Bây giờ mình sẽ tiến hành khai thác theo hướng không RCE.

#### Sensitive Data Exposure

Vì muốn demo impact này nên mình đã put thêm một số thông tin bí mật vào trong backend.

![image](https://hackmd.io/_uploads/ry8T0zfEZx.png)

Đối với SSTI, nếu như trong trường hợp developer không validate lại phần context hoặc là những nơi chứa dữ liệu quan trọng thì hoàn toàn có thể gây lộ lọt dữ liệu.

![image](https://hackmd.io/_uploads/SkDz8mGE-g.png)

![image](https://hackmd.io/_uploads/BJg78QGNZx.png)

#### Content Manipulation / Defacement

Ngoài ra nếu như user input không xử lý html và js đúng thì attacker có thể deface, thay đổi nội dung web, thậm chí thực thi XSS.

![image](https://hackmd.io/_uploads/Hk_YIXGNbx.png)

![image](https://hackmd.io/_uploads/rkecU7zNWg.png)

![image](https://hackmd.io/_uploads/SJ8MPQzN-e.png)

![image](https://hackmd.io/_uploads/r1gQDQMEWx.png)

#### Denial of Service (DoS)

Trong blacklist, ở level này mình để ý rằng các directive không hề được chặn, thay vào đó dev chỉ chặn đi các class có thể leo lên RCE. Nhưng với directive như là `$foreach` mình hoàn toàn có thể tạo một vòng lặp lớn gây nghẽn cho bên phía server.

```java 
#foreach($i in [1..10000000000])
$i
#end
```

![image](https://hackmd.io/_uploads/rk4POXf4-e.png)

ngoài #foreach với số lớn, việc sử dụng các vòng lặp đệ quy thông qua #parse hoặc #include cũng là một kỹ thuật DoS phổ biến.

#### Kết luận

Sau khi đi qua 3 level, ở level 1,2 mình đã cho thấy cách để bypass và thực thi RCE, tới với level 3 mình muốn hiểu rằng không nhất thiết cứ phải là RCE vì còn nhiều cách khác để có thể gây impact tới server cũng như tới user khác.