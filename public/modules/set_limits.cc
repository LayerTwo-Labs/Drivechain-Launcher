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
  
  // Get current limits
  struct rlimit current_rlim;
  if (getrlimit(RLIMIT_NOFILE, &current_rlim) != 0) {
    return Napi::Number::New(env, -1); // Error
  }
  
  // Don't set limit higher than the hard limit
  if (limit > current_rlim.rlim_max) {
    limit = current_rlim.rlim_max;
  }
  
  // Set up new rlimit - only change soft limit
  struct rlimit new_rlim;
  new_rlim.rlim_cur = limit;
  new_rlim.rlim_max = current_rlim.rlim_max; // Keep existing hard limit
  
  // Make the syscall
  int result = setrlimit(RLIMIT_NOFILE, &new_rlim);
  
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