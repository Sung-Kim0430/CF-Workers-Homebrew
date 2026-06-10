export function generateWelcomePage() {
  const html = `<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
<style>
    body { width: 35em; margin: 0 auto; font-family: Tahoma, Verdana, Arial, sans-serif; }
</style>
</head>
<body>
<h1>Welcome to nginx!</h1>
<p>If you see this page, the nginx web server is successfully installed and
working. Further configuration is required.</p>
<p>For online documentation and support please refer to
<a href="http://nginx.org/">nginx.org</a>.<br/>
Commercial support is available at
<a href="http://nginx.com/">nginx.com</a>.</p>
<p><em>Thank you for using nginx.</em></p>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
      'Server': 'nginx/1.24.0'
    }
  });
}

export function generate403Page() {
  const html = `<html>
<head><title>403 Forbidden</title></head>
<body>
<center><h1>403 Forbidden</h1></center>
<hr><center>nginx/1.24.0</center>
</body>
</html>`;

  return new Response(html, {
    status: 403,
    headers: {
      'Content-Type': 'text/html',
      'Server': 'nginx/1.24.0'
    }
  });
}
