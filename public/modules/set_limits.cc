#include <napi.h>
#include <sys/resource.h>

Napi::Value SetFileDescriptorLimit(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  // Check if we have the limit argument
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Number expected for limit").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  // Get the limit from JavaScript
  int limit = info[0].As<Napi::Number>().Int32Value();
  
  // Set up the rlimit struct
  struct rlimit rlim;
  rlim.rlim_cur = limit;
  rlim.rlim_max = limit;
  
  // Make the syscall
  int result = setrlimit(RLIMIT_NOFILE, &rlim);
  
  // Return the result to JavaScript (0 means success)
  return Napi::Number::New(env, result);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set(
    Napi::String::New(env, "setFileDescriptorLimit"),
    Napi::Function::New(env, SetFileDescriptorLimit)
  );
  return exports;
}

NODE_API_MODULE(set_limits, Init) 