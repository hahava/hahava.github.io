---
title: "Spring file upload"
categories:
 - spring
---

http 통신으로 이미지등의 파일을 전송할때는 일반적으로 `multipart-form/data` 를 통해 전달합니다.

## multipart-form/data 처리하기

multipart/form-data 란 http 스펙중 하나이며, 데이터를 `part` 단위로 구분하여 메시지 또는 파일을 전송합니다. 

<figure>
  <img src="{{site.baseurl}}/assets/img/multipart.png" />
</figure>  

html form 태그에서 사용시엔  속성을`enctype='multipart/form-data'` 로 설정해야 합니다.
각 part는 key/value 형태로 구성되었으며 part별 header가 존재하여 데이터 형식 및 값을 정의합니다. part는 `Boundary`를 통해 구분하며, `--` 구분자로 시작하는 규칙외에는 특별한 규칙이 존재하지 않습니다. 

```http
POST /upload-file HTTP/1.1
Host: localhost:8080
Content-Length: 265
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW

----WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="image"; filename="image.png"
Content-Type: image/png

(data)
----WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="name"

hahava
----WebKitFormBoundary7MA4YWxkTrZu0gW
```

## servlet 에서 파일 처리하기

servlet 3.0 이전에는 파일 관련 기능이 없어 개발자가 직접 request를 stream으로 파싱하여 사용해야 했습니다. 그러나 3.0 이후 `Part` 인터페이스를 구현하여 손 쉽게 처리할 수 있게 되었습니다. Part는 클라이언트에서 `multipart/form-data` 으로 전송시 해당 영역을 파싱하여 `Collection` 객체로 가지고 있게 됩니다.

```java
/**
 * This class represents a part as uploaded to the server as part of a
 * <code>multipart/form-data</code> request body. The part may represent either
 * an uploaded file or form data.
 *
 * @since Servlet 3.0
 */
public interface Part {

    /**
     * Obtain an <code>InputStream</code> that can be used to retrieve the
     * contents of the file.
     *
     * @return An InputStream for the contents of the file
     *
     * @throws IOException if an I/O occurs while obtaining the stream
     */
    public InputStream getInputStream() throws IOException;

    // ...중략...
}
```

servlet 에서 `@MultipartConfig` 또는 web.xml 에 `<multipart-config>` 관련 설정 추가시 아래 코드와 같이 간단하게 `getParts()` 를 호출하여 해당 객체를 관리할 수 있습니다. 

```java
@MultipartConfig
@WebServlet(name = "fileServlet", urlPatterns = "/upload-file")
public class FileServlet extends HttpServlet {
	@Override
	protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
		Collection<Part> parts = req.getParts();

		for (Part part : parts) {
			for (String headerName : part.getHeaderNames()) {
				System.out.println(headerName + " : " + part.getHeader(headerName));
			}

			if (part.getHeader("Content-Disposition").contains("filename=")) {
				String fileName = UUID.randomUUID().toString();
				Files.copy(part.getInputStream(), new File("/tmp/" + fileName).toPath());
			} else {
				System.out.println(part.getName() + "=" + req.getParameter(part.getName()));
			}

			System.out.println();
		}
	}
}
```

## spring 에서 파일 처리하기

spring 역시 servlet과 마찬가지로 multipart를 간단하게 처리하기 위한 인터페이스를 제공합니다. DispatcherSerlvet에서 request를 감지한뒤 multipart타입일 경우 `MultipartHttpServletRequest` 를 생성하여 비즈니스 로직을 수행하게 됩니다.

```java
protected void doDispatch(HttpServletRequest request, HttpServletResponse response) throws Exception {
  HttpServletRequest processedRequest = request;
  HandlerExecutionChain mappedHandler = null;
  boolean multipartRequestParsed = false;

  WebAsyncManager asyncManager = WebAsyncUtils.getAsyncManager(request);

  try {
    ModelAndView mv = null;
    Exception dispatchException = null;

    try {
      processedRequest = checkMultipart(request);
      multipartRequestParsed = (processedRequest != request);

//...중략...

protected HttpServletRequest checkMultipart(HttpServletRequest request) throws MultipartException {
  if (this.multipartResolver != null && this.multipartResolver.isMultipart(request)) {
    if (WebUtils.getNativeRequest(request, MultipartHttpServletRequest.class) != null) {
      if (DispatcherType.REQUEST.equals(request.getDispatcherType())) {
        logger.trace("Request already resolved to MultipartHttpServletRequest, e.g. by MultipartFilter");
      }
    }
    else if (hasMultipartException(request)) {
      logger.debug("Multipart resolution previously failed for current request - " +
          "skipping re-resolution for undisturbed error rendering");
    }
    else {
      try {
        return this.multipartResolver.resolveMultipart(request);
      }

//...중략...

// StandardMultipartHttpServletRequest.java 
private void parseRequest(HttpServletRequest request) {
  try {
    Collection<Part> parts = request.getParts();
    this.multipartParameterNames = new LinkedHashSet<>(parts.size());
    MultiValueMap<String, MultipartFile> files = new LinkedMultiValueMap<>(parts.size());
    for (Part part : parts) {
      String headerValue = part.getHeader(HttpHeaders.CONTENT_DISPOSITION);
      ContentDisposition disposition = ContentDisposition.parse(headerValue);
      String filename = disposition.getFilename();
      if (filename != null) {
        if (filename.startsWith("=?") && filename.endsWith("?=")) {
          filename = MimeDelegate.decode(filename);
        }
        files.add(part.getName(), new StandardMultipartFile(part, filename));
      }
      else {
        this.multipartParameterNames.add(part.getName());
      }
    }
    setMultipartFiles(files);
  }
  catch (Throwable ex) {
    handleParseFailure(ex);
  }
}
```

최종적으로 `parseRequest` 를 호출하게 됩니다. 이때 servlet의 `Part` 객체를 파싱하는 것을 확인할 수 있습니다. 파싱후에는 controller에서 `MultipartHttpServletRequest` 또는 `@RequestParam`을 이용하여 손쉽게 조작할 수 있습니다.

```java
@PostMapping("/upload-file-v2")
public ResponseEntity<Void> uploadImage(MultipartHttpServletRequest multipartHttpServletRequest) {
  System.out.println(multipartHttpServletRequest.getParameter("name"));
  System.out.println(multipartHttpServletRequest.getFile("image").getOriginalFilename());
  return ResponseEntity.noContent().build();
}

@PostMapping("/upload-file-v3")
public ResponseEntity<Void> uploadImageV2(@RequestParam MultipartFile image, @RequestParam String name) {
  System.out.println(name);
  System.out.println(image.getOriginalFilename());
  return ResponseEntity.noContent().build();
}
```