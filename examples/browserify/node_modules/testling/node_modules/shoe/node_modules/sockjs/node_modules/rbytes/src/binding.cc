#include <v8.h>
#include <node.h>
#include <node_buffer.h>
#include <openssl/rand.h>
#include <openssl/err.h>

using namespace v8;
using namespace node;

static const char *hexencode = "0123456789abcdef";
static const int hexdecode[] =
  {-1,-1,-1,-1,-1,-1,-1,-1,-1,-2,-2,-1,-1,-2,-1,-1
  ,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1
  ,-2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1
  , 0, 1, 2, 3, 4, 5, 6, 7, 8, 9,-1,-1,-1,-1,-1,-1
  ,-1,10,11,12,13,14,15,-1,-1,-1,-1,-1,-1,-1,-1,-1
  ,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1
  ,-1,10,11,12,13,14,15,-1,-1,-1,-1,-1,-1,-1,-1,-1
  };

static inline int check_byte(uint8_t b) {
  if (b >= 0x80) return -1;
  return hexdecode[b];
}

Handle<Value> RandBytes(const Arguments &args) {
  HandleScope scope;
  if (!Buffer::HasInstance(args[0])) {
    return ThrowException(Exception::TypeError(String::New(
            "First argument must be a Buffer")));
  }
  Local<Object> buf = args[0]->ToObject();
  char *data = Buffer::Data(buf);
  size_t length = Buffer::Length(buf);

  switch (RAND_bytes((unsigned char*) data, length)) {
    case -1:
      return ThrowException(Exception::Error(String::New(
              "Current RAND method does not support this operation")));
    case 0:
      unsigned long code = ERR_get_error();
      return ThrowException(Exception::Error(String::New(
              ERR_error_string(code, NULL))));
  }

  return scope.Close(Integer::NewFromUnsigned(length));
}

Handle<Value> BufToHex(const Arguments &args) {
  HandleScope scope;
  if (!Buffer::HasInstance(args[0])) {
    return ThrowException(Exception::TypeError(String::New(
            "First argument must be a Buffer")));
  }
  Local<Object> buf = args[0]->ToObject();
  char *data = Buffer::Data(buf);
  size_t length = Buffer::Length(buf);

  int out_len = length * 2;
  char *out = new char[out_len];

  int i;
  for (i=0; i<length; i++) {
      out[2*i]     = hexencode[(data[i] & 0xf0) >> 4];
      out[2*i + 1] = hexencode[ data[i] & 0x0f      ];
  }

  Local<String> retval = String::New(out, out_len);
  delete [] out;
  return scope.Close(retval);
}

Handle<Value> HexToBuf(const Arguments &args) {
  HandleScope scope;
  if (!args[0]->IsString()) {
    return ThrowException(Exception::TypeError(String::New(
            "First argument must be a String")));
  }
  if (!Buffer::HasInstance(args[1])) {
    return ThrowException(Exception::TypeError(String::New(
            "Second argument must be a Buffer")));
  }
  Local<String> str = args[0]->ToString();
  Local<Object> buf = args[1]->ToObject();

  String::Utf8Value v(str);
  char *data = *v;
  size_t length = v.length();

  int out_len = length >> 1;
  char *out = Buffer::Data(buf);
  size_t buf_len = Buffer::Length(buf);

  int to_write = out_len;
  if (length & 1) {
    char b = check_byte(data[0]);
    if (b < 0) {
      return ThrowException(Exception::TypeError(String::New(
              "Invalid hex string")));
    }
    *out++ = b;
    data++;
    to_write++;
  }

  if (to_write > buf_len) {
    return ThrowException(Exception::Error(String::New(
            "Buffer too small")));
  }

  int i;
  for (i=0; i<out_len; i++) {
    char l = check_byte(data[2*i]);
    char r = check_byte(data[2*i + 1]);
    if (l < 0 || r < 0) {
      return ThrowException(Exception::TypeError(String::New(
              "Invalid hex string")));
    }
    *out++ = (l << 4) | r;
  }

  return scope.Close(Integer::NewFromUnsigned(to_write));
}

extern "C"
void init(Handle<Object> target) {
  HandleScope scope;
  target->Set(String::NewSymbol("randomBytes"),
          FunctionTemplate::New(RandBytes)->GetFunction());
  target->Set(String::NewSymbol("bufToHex"),
          FunctionTemplate::New(BufToHex)->GetFunction());
  target->Set(String::NewSymbol("hexToBuf"),
          FunctionTemplate::New(HexToBuf)->GetFunction());
}