import type { RequestConfig } from '../types';

export type CodeLanguage =
  | 'curl'
  | 'javascript_fetch'
  | 'javascript_axios'
  | 'javascript_node'
  | 'python_requests'
  | 'python_httpx'
  | 'go'
  | 'java'
  | 'csharp'
  | 'php_curl'
  | 'php_guzzle'
  | 'ruby'
  | 'swift'
  | 'kotlin';

export interface CodeGeneratorOptions {
  language: CodeLanguage;
  includeComments?: boolean;
  prettyPrint?: boolean;
}

interface LanguageConfig {
  id: CodeLanguage;
  name: string;
  category: string;
  extension: string;
}

export class CodeGeneratorService {
  readonly languages: LanguageConfig[] = [
    { id: 'curl', name: 'cURL', category: 'Shell', extension: 'sh' },
    { id: 'javascript_fetch', name: 'Fetch API', category: 'JavaScript', extension: 'js' },
    { id: 'javascript_axios', name: 'Axios', category: 'JavaScript', extension: 'js' },
    { id: 'javascript_node', name: 'Node.js (https)', category: 'JavaScript', extension: 'js' },
    { id: 'python_requests', name: 'Requests', category: 'Python', extension: 'py' },
    { id: 'python_httpx', name: 'HTTPX', category: 'Python', extension: 'py' },
    { id: 'go', name: 'Go (net/http)', category: 'Go', extension: 'go' },
    { id: 'java', name: 'Java (HttpClient)', category: 'Java', extension: 'java' },
    { id: 'csharp', name: 'C# (HttpClient)', category: 'C#', extension: 'cs' },
    { id: 'php_curl', name: 'cURL', category: 'PHP', extension: 'php' },
    { id: 'php_guzzle', name: 'Guzzle', category: 'PHP', extension: 'php' },
    { id: 'ruby', name: 'Net::HTTP', category: 'Ruby', extension: 'rb' },
    { id: 'swift', name: 'URLSession', category: 'Swift', extension: 'swift' },
    { id: 'kotlin', name: 'OkHttp', category: 'Kotlin', extension: 'kt' },
  ];

  /**
   * Generate code for a request
   */
  generate(request: RequestConfig, options: CodeGeneratorOptions): string {
    const generators: Record<CodeLanguage, () => string> = {
      curl: () => this.generateCurl(request, options),
      javascript_fetch: () => this.generateJavaScriptFetch(request, options),
      javascript_axios: () => this.generateJavaScriptAxios(request, options),
      javascript_node: () => this.generateJavaScriptNode(request, options),
      python_requests: () => this.generatePythonRequests(request, options),
      python_httpx: () => this.generatePythonHttpx(request, options),
      go: () => this.generateGo(request, options),
      java: () => this.generateJava(request, options),
      csharp: () => this.generateCSharp(request, options),
      php_curl: () => this.generatePhpCurl(request, options),
      php_guzzle: () => this.generatePhpGuzzle(request, options),
      ruby: () => this.generateRuby(request, options),
      swift: () => this.generateSwift(request, options),
      kotlin: () => this.generateKotlin(request, options),
    };

    return generators[options.language]();
  }

  private getHeaders(request: RequestConfig): Record<string, string> {
    const headers: Record<string, string> = {};
    request.headers.filter(h => h.enabled && h.key).forEach(h => {
      headers[h.key] = h.value;
    });

    // Add auth headers
    if (request.auth?.type === 'basic' && request.auth.basic) {
      const credentials = Buffer.from(
        `${request.auth.basic.username}:${request.auth.basic.password}`
      ).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    } else if (request.auth?.type === 'bearer' && request.auth.bearer) {
      headers['Authorization'] = `Bearer ${request.auth.bearer.token}`;
    } else if (request.auth?.type === 'apiKey' && request.auth.apiKey?.addTo === 'header') {
      headers[request.auth.apiKey.key] = request.auth.apiKey.value;
    }

    // Add content-type if body exists
    if (request.body && !headers['Content-Type']) {
      if (request.bodyType === 'json') {
        headers['Content-Type'] = 'application/json';
      } else if (request.bodyType === 'form-urlencoded') {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
      }
    }

    return headers;
  }

  private buildUrl(request: RequestConfig): string {
    let url = request.url;
    const params = request.params.filter(p => p.enabled && p.key);

    // Add API key to query params if configured
    if (request.auth?.type === 'apiKey' && request.auth.apiKey?.addTo === 'query') {
      params.push({
        id: 'apikey',
        key: request.auth.apiKey.key,
        value: request.auth.apiKey.value,
        enabled: true,
      });
    }

    if (params.length > 0) {
      const queryString = params.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
      url += (url.includes('?') ? '&' : '?') + queryString;
    }

    return url;
  }

  private escapeString(str: string, quote: string = "'"): string {
    return str.replace(new RegExp(quote, 'g'), `\\${quote}`);
  }

  private generateCurl(request: RequestConfig, _options: CodeGeneratorOptions): string {
    const headers = this.getHeaders(request);
    const url = this.buildUrl(request);
    const lines: string[] = [];

    lines.push(`curl -X ${request.method} \\`);
    lines.push(`  '${this.escapeString(url)}' \\`);

    for (const [key, value] of Object.entries(headers)) {
      lines.push(`  -H '${key}: ${this.escapeString(value)}' \\`);
    }

    if (request.body) {
      lines.push(`  -d '${this.escapeString(request.body)}'`);
    } else {
      // Remove trailing backslash from last line
      lines[lines.length - 1] = lines[lines.length - 1]!.replace(/ \\$/, '');
    }

    return lines.join('\n');
  }

  private generateJavaScriptFetch(request: RequestConfig, options: CodeGeneratorOptions): string {
    const headers = this.getHeaders(request);
    const url = this.buildUrl(request);

    const fetchOptions: string[] = [];
    fetchOptions.push(`  method: '${request.method}'`);

    if (Object.keys(headers).length > 0) {
      const headerStr = options.prettyPrint
        ? JSON.stringify(headers, null, 4).replace(/\n/g, '\n  ')
        : JSON.stringify(headers);
      fetchOptions.push(`  headers: ${headerStr}`);
    }

    if (request.body) {
      fetchOptions.push(`  body: ${JSON.stringify(request.body)}`);
    }

    return `fetch('${url}', {
${fetchOptions.join(',\n')}
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`;
  }

  private generateJavaScriptAxios(request: RequestConfig, _options: CodeGeneratorOptions): string {
    const headers = this.getHeaders(request);
    const url = this.buildUrl(request);

    const config: string[] = [];
    config.push(`  method: '${request.method.toLowerCase()}'`);
    config.push(`  url: '${url}'`);

    if (Object.keys(headers).length > 0) {
      config.push(`  headers: ${JSON.stringify(headers, null, 4).replace(/\n/g, '\n  ')}`);
    }

    if (request.body) {
      config.push(`  data: ${request.body}`);
    }

    return `const axios = require('axios');

axios({
${config.join(',\n')}
})
  .then(response => {
    console.log(response.data);
  })
  .catch(error => {
    console.error(error);
  });`;
  }

  private generateJavaScriptNode(request: RequestConfig, _options: CodeGeneratorOptions): string {
    const headers = this.getHeaders(request);
    const url = new URL(this.buildUrl(request));
    const isHttps = url.protocol === 'https:';

    return `const ${isHttps ? 'https' : 'http'} = require('${isHttps ? 'https' : 'http'}');

const options = {
  hostname: '${url.hostname}',
  port: ${url.port || (isHttps ? 443 : 80)},
  path: '${url.pathname}${url.search}',
  method: '${request.method}',
  headers: ${JSON.stringify(headers, null, 4).replace(/\n/g, '\n  ')}
};

const req = ${isHttps ? 'https' : 'http'}.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(data));
});

req.on('error', (error) => console.error(error));
${request.body ? `req.write(${JSON.stringify(request.body)});` : ''}
req.end();`;
  }

  private generatePythonRequests(request: RequestConfig, _options: CodeGeneratorOptions): string {
    const headers = this.getHeaders(request);
    const url = this.buildUrl(request);

    const lines: string[] = [];
    lines.push('import requests');
    lines.push('');
    lines.push(`url = "${url}"`);

    if (Object.keys(headers).length > 0) {
      lines.push(`headers = ${JSON.stringify(headers, null, 4)}`);
    }

    if (request.body) {
      lines.push(`data = ${request.body}`);
    }

    const args: string[] = ['url'];
    if (Object.keys(headers).length > 0) args.push('headers=headers');
    if (request.body) args.push('json=data');

    lines.push('');
    lines.push(`response = requests.${request.method.toLowerCase()}(${args.join(', ')})`);
    lines.push('print(response.json())');

    return lines.join('\n');
  }

  private generatePythonHttpx(request: RequestConfig, _options: CodeGeneratorOptions): string {
    const headers = this.getHeaders(request);
    const url = this.buildUrl(request);

    return `import httpx

url = "${url}"
headers = ${JSON.stringify(headers, null, 4)}
${request.body ? `data = ${request.body}` : ''}

async def main():
    async with httpx.AsyncClient() as client:
        response = await client.${request.method.toLowerCase()}(
            url,
            headers=headers${request.body ? ',\n            json=data' : ''}
        )
        print(response.json())

import asyncio
asyncio.run(main())`;
  }

  private generateGo(request: RequestConfig, _options: CodeGeneratorOptions): string {
    const headers = this.getHeaders(request);
    const url = this.buildUrl(request);

    const bodySetup = request.body
      ? `\n\tbody := strings.NewReader(\`${request.body}\`)`
      : '\n\tvar body io.Reader = nil';

    const headerSetup = Object.entries(headers)
      .map(([k, v]) => `\treq.Header.Set("${k}", "${v}")`)
      .join('\n');

    return `package main

import (
\t"fmt"
\t"io"
\t"net/http"
\t"strings"
)

func main() {${bodySetup}

\treq, err := http.NewRequest("${request.method}", "${url}", body)
\tif err != nil {
\t\tpanic(err)
\t}

${headerSetup}

\tclient := &http.Client{}
\tresp, err := client.Do(req)
\tif err != nil {
\t\tpanic(err)
\t}
\tdefer resp.Body.Close()

\trespBody, _ := io.ReadAll(resp.Body)
\tfmt.Println(string(respBody))
}`;
  }

  private generateJava(request: RequestConfig, _options: CodeGeneratorOptions): string {
    const headers = this.getHeaders(request);
    const url = this.buildUrl(request);

    const headerSetup = Object.entries(headers)
      .map(([k, v]) => `            .header("${k}", "${v}")`)
      .join('\n');

    const bodySetup = request.body
      ? `.POST(HttpRequest.BodyPublishers.ofString(${JSON.stringify(request.body)}))`
      : `.${request.method}()`;

    return `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class Main {
    public static void main(String[] args) throws Exception {
        HttpClient client = HttpClient.newHttpClient();

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("${url}"))
${headerSetup}
            ${bodySetup}
            .build();

        HttpResponse<String> response = client.send(request,
            HttpResponse.BodyHandlers.ofString());

        System.out.println(response.body());
    }
}`;
  }

  private generateCSharp(request: RequestConfig, _options: CodeGeneratorOptions): string {
    const headers = this.getHeaders(request);
    const url = this.buildUrl(request);

    const headerSetup = Object.entries(headers)
      .filter(([k]) => !['Content-Type'].includes(k))
      .map(([k, v]) => `    client.DefaultRequestHeaders.Add("${k}", "${v}");`)
      .join('\n');

    return `using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

class Program
{
    static async Task Main(string[] args)
    {
        using var client = new HttpClient();
${headerSetup}

        var response = await client.${this.getCSharpMethod(request)}Async(
            "${url}"${request.body ? `,
            new StringContent(
                ${JSON.stringify(request.body)},
                Encoding.UTF8,
                "application/json"
            )` : ''}
        );

        var content = await response.Content.ReadAsStringAsync();
        Console.WriteLine(content);
    }
}`;
  }

  private getCSharpMethod(request: RequestConfig): string {
    const map: Record<string, string> = {
      GET: 'Get',
      POST: 'Post',
      PUT: 'Put',
      DELETE: 'Delete',
      PATCH: 'Patch',
    };
    return map[request.method] || 'Send';
  }

  private generatePhpCurl(request: RequestConfig, _options: CodeGeneratorOptions): string {
    const headers = this.getHeaders(request);
    const url = this.buildUrl(request);

    const headerArray = Object.entries(headers)
      .map(([k, v]) => `    "${k}: ${v}"`)
      .join(',\n');

    return `<?php
$ch = curl_init();

curl_setopt_array($ch, [
    CURLOPT_URL => "${url}",
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST => "${request.method}",
    CURLOPT_HTTPHEADER => [
${headerArray}
    ],${request.body ? `
    CURLOPT_POSTFIELDS => ${JSON.stringify(request.body)},` : ''}
]);

$response = curl_exec($ch);
$error = curl_error($ch);
curl_close($ch);

if ($error) {
    echo "Error: " . $error;
} else {
    echo $response;
}`;
  }

  private generatePhpGuzzle(request: RequestConfig, _options: CodeGeneratorOptions): string {
    const headers = this.getHeaders(request);
    const url = this.buildUrl(request);

    return `<?php
require 'vendor/autoload.php';

use GuzzleHttp\\Client;

$client = new Client();

$response = $client->request('${request.method}', '${url}', [
    'headers' => ${JSON.stringify(headers, null, 4).replace(/\n/g, '\n    ')},${request.body ? `
    'json' => ${request.body},` : ''}
]);

echo $response->getBody();`;
  }

  private generateRuby(request: RequestConfig, _options: CodeGeneratorOptions): string {
    const headers = this.getHeaders(request);
    const url = this.buildUrl(request);
    const parsedUrl = new URL(url);

    const headerSetup = Object.entries(headers)
      .map(([k, v]) => `request["${k}"] = "${v}"`)
      .join('\n');

    return `require 'net/http'
require 'uri'
require 'json'

uri = URI.parse("${url}")
http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = ${parsedUrl.protocol === 'https:'}

request = Net::HTTP::${request.method.charAt(0) + request.method.slice(1).toLowerCase()}.new(uri.request_uri)
${headerSetup}
${request.body ? `request.body = ${JSON.stringify(request.body)}` : ''}

response = http.request(request)
puts response.body`;
  }

  private generateSwift(request: RequestConfig, _options: CodeGeneratorOptions): string {
    const headers = this.getHeaders(request);
    const url = this.buildUrl(request);

    const headerSetup = Object.entries(headers)
      .map(([k, v]) => `request.setValue("${v}", forHTTPHeaderField: "${k}")`)
      .join('\n');

    return `import Foundation

let url = URL(string: "${url}")!
var request = URLRequest(url: url)
request.httpMethod = "${request.method}"
${headerSetup}
${request.body ? `request.httpBody = ${JSON.stringify(request.body)}.data(using: .utf8)` : ''}

let task = URLSession.shared.dataTask(with: request) { data, response, error in
    if let error = error {
        print("Error: \\(error)")
        return
    }

    if let data = data, let string = String(data: data, encoding: .utf8) {
        print(string)
    }
}

task.resume()

// Keep the script running for async operation
RunLoop.main.run()`;
  }

  private generateKotlin(request: RequestConfig, _options: CodeGeneratorOptions): string {
    const headers = this.getHeaders(request);
    const url = this.buildUrl(request);

    const headerSetup = Object.entries(headers)
      .map(([k, v]) => `        .addHeader("${k}", "${v}")`)
      .join('\n');

    return `import okhttp3.OkHttpClient
import okhttp3.Request
${request.body ? 'import okhttp3.RequestBody.Companion.toRequestBody\nimport okhttp3.MediaType.Companion.toMediaType' : ''}

fun main() {
    val client = OkHttpClient()
    ${request.body ? `\n    val mediaType = "application/json".toMediaType()
    val body = ${JSON.stringify(request.body)}.toRequestBody(mediaType)\n` : ''}
    val request = Request.Builder()
        .url("${url}")
        .${request.method.toLowerCase()}(${request.body ? 'body' : ''})
${headerSetup}
        .build()

    client.newCall(request).execute().use { response ->
        println(response.body?.string())
    }
}`;
  }
}

export const codeGeneratorService = new CodeGeneratorService();
