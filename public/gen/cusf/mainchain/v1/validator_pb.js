// CUSF mainchain validator service 

// @generated by protoc-gen-es v2.2.5 with parameter "js_import_style=legacy_commonjs"
// @generated from file cusf/mainchain/v1/validator.proto (package cusf.mainchain.v1, syntax proto3)
/* eslint-disable */

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const { enumDesc, fileDesc, messageDesc, serviceDesc, tsEnum } = require("@bufbuild/protobuf/codegenv1");
const { file_google_protobuf_wrappers } = require("@bufbuild/protobuf/wkt");
const { file_cusf_common_v1_common } = require("../../common/v1/common_pb");
const { file_cusf_mainchain_v1_common } = require("./common_pb");

/**
 * Describes the file cusf/mainchain/v1/validator.proto.
 */
const file_cusf_mainchain_v1_validator = /*@__PURE__*/
  fileDesc("CiFjdXNmL21haW5jaGFpbi92MS92YWxpZGF0b3IucHJvdG8SEWN1c2YubWFpbmNoYWluLnYxIrIBCg9CbG9ja0hlYWRlckluZm8SLgoKYmxvY2tfaGFzaBgBIAEoCzIaLmN1c2YuY29tbW9uLnYxLlJldmVyc2VIZXgSMwoPcHJldl9ibG9ja19oYXNoGAIgASgLMhouY3VzZi5jb21tb24udjEuUmV2ZXJzZUhleBIOCgZoZWlnaHQYAyABKA0SKgoEd29yaxgEIAEoCzIcLmN1c2YuY29tbW9uLnYxLkNvbnNlbnN1c0hleCKEAgoHRGVwb3NpdBI1Cg9zZXF1ZW5jZV9udW1iZXIYASABKAsyHC5nb29nbGUucHJvdG9idWYuVUludDY0VmFsdWUSLQoIb3V0cG9pbnQYAiABKAsyGy5jdXNmLm1haW5jaGFpbi52MS5PdXRQb2ludBIxCgZvdXRwdXQYAyABKAsyIS5jdXNmLm1haW5jaGFpbi52MS5EZXBvc2l0Lk91dHB1dBpgCgZPdXRwdXQSJAoHYWRkcmVzcxgCIAEoCzITLmN1c2YuY29tbW9uLnYxLkhleBIwCgp2YWx1ZV9zYXRzGAMgASgLMhwuZ29vZ2xlLnByb3RvYnVmLlVJbnQ2NFZhbHVlIooEChVXaXRoZHJhd2FsQnVuZGxlRXZlbnQSKgoEbTZpZBgBIAEoCzIcLmN1c2YuY29tbW9uLnYxLkNvbnNlbnN1c0hleBI9CgVldmVudBgCIAEoCzIuLmN1c2YubWFpbmNoYWluLnYxLldpdGhkcmF3YWxCdW5kbGVFdmVudC5FdmVudBqFAwoFRXZlbnQSRwoGZmFpbGVkGAEgASgLMjUuY3VzZi5tYWluY2hhaW4udjEuV2l0aGRyYXdhbEJ1bmRsZUV2ZW50LkV2ZW50LkZhaWxlZEgAEk0KCXN1Y2NlZWRlZBgCIAEoCzI4LmN1c2YubWFpbmNoYWluLnYxLldpdGhkcmF3YWxCdW5kbGVFdmVudC5FdmVudC5TdWNjZWVkZWRIABJNCglzdWJtaXR0ZWQYAyABKAsyOC5jdXNmLm1haW5jaGFpbi52MS5XaXRoZHJhd2FsQnVuZGxlRXZlbnQuRXZlbnQuU3VibWl0dGVkSAAaCAoGRmFpbGVkGnUKCVN1Y2NlZWRlZBI1Cg9zZXF1ZW5jZV9udW1iZXIYASABKAsyHC5nb29nbGUucHJvdG9idWYuVUludDY0VmFsdWUSMQoLdHJhbnNhY3Rpb24YAiABKAsyHC5jdXNmLmNvbW1vbi52MS5Db25zZW5zdXNIZXgaCwoJU3VibWl0dGVkQgcKBWV2ZW50IpYCCglCbG9ja0luZm8SOQoOYm1tX2NvbW1pdG1lbnQYASABKAsyHC5jdXNmLmNvbW1vbi52MS5Db25zZW5zdXNIZXhIAIgBARIyCgZldmVudHMYAiADKAsyIi5jdXNmLm1haW5jaGFpbi52MS5CbG9ja0luZm8uRXZlbnQahgEKBUV2ZW50Ei0KB2RlcG9zaXQYASABKAsyGi5jdXNmLm1haW5jaGFpbi52MS5EZXBvc2l0SAASRQoRd2l0aGRyYXdhbF9idW5kbGUYAiABKAsyKC5jdXNmLm1haW5jaGFpbi52MS5XaXRoZHJhd2FsQnVuZGxlRXZlbnRIAEIHCgVldmVudEIRCg9fYm1tX2NvbW1pdG1lbnQieQoZR2V0QmxvY2tIZWFkZXJJbmZvUmVxdWVzdBIuCgpibG9ja19oYXNoGAEgASgLMhouY3VzZi5jb21tb24udjEuUmV2ZXJzZUhleBIaCg1tYXhfYW5jZXN0b3JzGAIgASgNSACIAQFCEAoOX21heF9hbmNlc3RvcnMikQEKGkdldEJsb2NrSGVhZGVySW5mb1Jlc3BvbnNlEjcKC2hlYWRlcl9pbmZvGAEgASgLMiIuY3VzZi5tYWluY2hhaW4udjEuQmxvY2tIZWFkZXJJbmZvEjoKDmFuY2VzdG9yX2luZm9zGAIgAygLMiIuY3VzZi5tYWluY2hhaW4udjEuQmxvY2tIZWFkZXJJbmZvIqcBChNHZXRCbG9ja0luZm9SZXF1ZXN0Ei4KCmJsb2NrX2hhc2gYASABKAsyGi5jdXNmLmNvbW1vbi52MS5SZXZlcnNlSGV4EjIKDHNpZGVjaGFpbl9pZBgCIAEoCzIcLmdvb2dsZS5wcm90b2J1Zi5VSW50MzJWYWx1ZRIaCg1tYXhfYW5jZXN0b3JzGAMgASgNSACIAQFCEAoOX21heF9hbmNlc3RvcnMiiwIKFEdldEJsb2NrSW5mb1Jlc3BvbnNlEjoKBGluZm8YASABKAsyLC5jdXNmLm1haW5jaGFpbi52MS5HZXRCbG9ja0luZm9SZXNwb25zZS5JbmZvEkQKDmFuY2VzdG9yX2luZm9zGAIgAygLMiwuY3VzZi5tYWluY2hhaW4udjEuR2V0QmxvY2tJbmZvUmVzcG9uc2UuSW5mbxpxCgRJbmZvEjcKC2hlYWRlcl9pbmZvGAEgASgLMiIuY3VzZi5tYWluY2hhaW4udjEuQmxvY2tIZWFkZXJJbmZvEjAKCmJsb2NrX2luZm8YAiABKAsyHC5jdXNmLm1haW5jaGFpbi52MS5CbG9ja0luZm8isAEKHEdldEJtbUhTdGFyQ29tbWl0bWVudFJlcXVlc3QSLgoKYmxvY2tfaGFzaBgBIAEoCzIaLmN1c2YuY29tbW9uLnYxLlJldmVyc2VIZXgSMgoMc2lkZWNoYWluX2lkGAIgASgLMhwuZ29vZ2xlLnByb3RvYnVmLlVJbnQzMlZhbHVlEhoKDW1heF9hbmNlc3RvcnMYAyABKA1IAIgBAUIQCg5fbWF4X2FuY2VzdG9ycyK2BAodR2V0Qm1tSFN0YXJDb21taXRtZW50UmVzcG9uc2USXgoPYmxvY2tfbm90X2ZvdW5kGAEgASgLMkMuY3VzZi5tYWluY2hhaW4udjEuR2V0Qm1tSFN0YXJDb21taXRtZW50UmVzcG9uc2UuQmxvY2tOb3RGb3VuZEVycm9ySAASUQoKY29tbWl0bWVudBgCIAEoCzI7LmN1c2YubWFpbmNoYWluLnYxLkdldEJtbUhTdGFyQ29tbWl0bWVudFJlc3BvbnNlLkNvbW1pdG1lbnRIABpEChJCbG9ja05vdEZvdW5kRXJyb3ISLgoKYmxvY2tfaGFzaBgBIAEoCzIaLmN1c2YuY29tbW9uLnYxLlJldmVyc2VIZXgaWgoST3B0aW9uYWxDb21taXRtZW50EjUKCmNvbW1pdG1lbnQYASABKAsyHC5jdXNmLmNvbW1vbi52MS5Db25zZW5zdXNIZXhIAIgBAUINCgtfY29tbWl0bWVudBq1AQoKQ29tbWl0bWVudBI1Cgpjb21taXRtZW50GAEgASgLMhwuY3VzZi5jb21tb24udjEuQ29uc2Vuc3VzSGV4SACIAQESYQoUYW5jZXN0b3JfY29tbWl0bWVudHMYAiADKAsyQy5jdXNmLm1haW5jaGFpbi52MS5HZXRCbW1IU3RhckNvbW1pdG1lbnRSZXNwb25zZS5PcHRpb25hbENvbW1pdG1lbnRCDQoLX2NvbW1pdG1lbnRCCAoGcmVzdWx0IhUKE0dldENoYWluSW5mb1JlcXVlc3QiQwoUR2V0Q2hhaW5JbmZvUmVzcG9uc2USKwoHbmV0d29yaxgBIAEoDjIaLmN1c2YubWFpbmNoYWluLnYxLk5ldHdvcmsiFAoSR2V0Q2hhaW5UaXBSZXF1ZXN0IlQKE0dldENoYWluVGlwUmVzcG9uc2USPQoRYmxvY2tfaGVhZGVyX2luZm8YASABKAsyIi5jdXNmLm1haW5jaGFpbi52MS5CbG9ja0hlYWRlckluZm8irwgKFkdldENvaW5iYXNlUFNCVFJlcXVlc3QSVgoScHJvcG9zZV9zaWRlY2hhaW5zGAEgAygLMjouY3VzZi5tYWluY2hhaW4udjEuR2V0Q29pbmJhc2VQU0JUUmVxdWVzdC5Qcm9wb3NlU2lkZWNoYWluEk4KDmFja19zaWRlY2hhaW5zGAIgAygLMjYuY3VzZi5tYWluY2hhaW4udjEuR2V0Q29pbmJhc2VQU0JUUmVxdWVzdC5BY2tTaWRlY2hhaW4SUAoPcHJvcG9zZV9idW5kbGVzGAMgAygLMjcuY3VzZi5tYWluY2hhaW4udjEuR2V0Q29pbmJhc2VQU0JUUmVxdWVzdC5Qcm9wb3NlQnVuZGxlEkkKC2Fja19idW5kbGVzGAQgASgLMjQuY3VzZi5tYWluY2hhaW4udjEuR2V0Q29pbmJhc2VQU0JUUmVxdWVzdC5BY2tCdW5kbGVzGnYKEFByb3Bvc2VTaWRlY2hhaW4SNgoQc2lkZWNoYWluX251bWJlchgBIAEoCzIcLmdvb2dsZS5wcm90b2J1Zi5VSW50MzJWYWx1ZRIqCgRkYXRhGAIgASgLMhwuY3VzZi5jb21tb24udjEuQ29uc2Vuc3VzSGV4GncKDEFja1NpZGVjaGFpbhI2ChBzaWRlY2hhaW5fbnVtYmVyGAEgASgLMhwuZ29vZ2xlLnByb3RvYnVmLlVJbnQzMlZhbHVlEi8KCWRhdGFfaGFzaBgCIAEoCzIcLmN1c2YuY29tbW9uLnYxLkNvbnNlbnN1c0hleBp4Cg1Qcm9wb3NlQnVuZGxlEjYKEHNpZGVjaGFpbl9udW1iZXIYASABKAsyHC5nb29nbGUucHJvdG9idWYuVUludDMyVmFsdWUSLwoLYnVuZGxlX3R4aWQYAiABKAsyGi5jdXNmLmNvbW1vbi52MS5SZXZlcnNlSGV4GuQCCgpBY2tCdW5kbGVzEl4KD3JlcGVhdF9wcmV2aW91cxgBIAEoCzJDLmN1c2YubWFpbmNoYWluLnYxLkdldENvaW5iYXNlUFNCVFJlcXVlc3QuQWNrQnVuZGxlcy5SZXBlYXRQcmV2aW91c0gAElkKDWxlYWRpbmdfYnlfNTAYAiABKAsyQC5jdXNmLm1haW5jaGFpbi52MS5HZXRDb2luYmFzZVBTQlRSZXF1ZXN0LkFja0J1bmRsZXMuTGVhZGluZ0J5NTBIABJPCgd1cHZvdGVzGAMgASgLMjwuY3VzZi5tYWluY2hhaW4udjEuR2V0Q29pbmJhc2VQU0JUUmVxdWVzdC5BY2tCdW5kbGVzLlVwdm90ZXNIABoQCg5SZXBlYXRQcmV2aW91cxoNCgtMZWFkaW5nQnk1MBoaCgdVcHZvdGVzEg8KB3Vwdm90ZXMYASADKA1CDQoLYWNrX2J1bmRsZXMiRQoXR2V0Q29pbmJhc2VQU0JUUmVzcG9uc2USKgoEcHNidBgBIAEoCzIcLmN1c2YuY29tbW9uLnYxLkNvbnNlbnN1c0hleCJICg5HZXRDdGlwUmVxdWVzdBI2ChBzaWRlY2hhaW5fbnVtYmVyGAEgASgLMhwuZ29vZ2xlLnByb3RvYnVmLlVJbnQzMlZhbHVlIr4BCg9HZXRDdGlwUmVzcG9uc2USOgoEY3RpcBgBIAEoCzInLmN1c2YubWFpbmNoYWluLnYxLkdldEN0aXBSZXNwb25zZS5DdGlwSACIAQEaZgoEQ3RpcBIoCgR0eGlkGAEgASgLMhouY3VzZi5jb21tb24udjEuUmV2ZXJzZUhleBIMCgR2b3V0GAIgASgNEg0KBXZhbHVlGAMgASgEEhcKD3NlcXVlbmNlX251bWJlchgEIAEoBEIHCgVfY3RpcCIeChxHZXRTaWRlY2hhaW5Qcm9wb3NhbHNSZXF1ZXN0Iq8ECh1HZXRTaWRlY2hhaW5Qcm9wb3NhbHNSZXNwb25zZRJfChNzaWRlY2hhaW5fcHJvcG9zYWxzGAEgAygLMkIuY3VzZi5tYWluY2hhaW4udjEuR2V0U2lkZWNoYWluUHJvcG9zYWxzUmVzcG9uc2UuU2lkZWNoYWluUHJvcG9zYWwarAMKEVNpZGVjaGFpblByb3Bvc2FsEjYKEHNpZGVjaGFpbl9udW1iZXIYASABKAsyHC5nb29nbGUucHJvdG9idWYuVUludDMyVmFsdWUSMQoLZGVzY3JpcHRpb24YAiABKAsyHC5jdXNmLmNvbW1vbi52MS5Db25zZW5zdXNIZXgSQQoLZGVjbGFyYXRpb24YByABKAsyJy5jdXNmLm1haW5jaGFpbi52MS5TaWRlY2hhaW5EZWNsYXJhdGlvbkgAiAEBEjwKGGRlc2NyaXB0aW9uX3NoYTI1NmRfaGFzaBgDIAEoCzIaLmN1c2YuY29tbW9uLnYxLlJldmVyc2VIZXgSMAoKdm90ZV9jb3VudBgEIAEoCzIcLmdvb2dsZS5wcm90b2J1Zi5VSW50MzJWYWx1ZRI1Cg9wcm9wb3NhbF9oZWlnaHQYBSABKAsyHC5nb29nbGUucHJvdG9idWYuVUludDMyVmFsdWUSMgoMcHJvcG9zYWxfYWdlGAYgASgLMhwuZ29vZ2xlLnByb3RvYnVmLlVJbnQzMlZhbHVlQg4KDF9kZWNsYXJhdGlvbiIWChRHZXRTaWRlY2hhaW5zUmVxdWVzdCLVAwoVR2V0U2lkZWNoYWluc1Jlc3BvbnNlEkoKCnNpZGVjaGFpbnMYASADKAsyNi5jdXNmLm1haW5jaGFpbi52MS5HZXRTaWRlY2hhaW5zUmVzcG9uc2UuU2lkZWNoYWluSW5mbxrvAgoNU2lkZWNoYWluSW5mbxI2ChBzaWRlY2hhaW5fbnVtYmVyGAEgASgLMhwuZ29vZ2xlLnByb3RvYnVmLlVJbnQzMlZhbHVlEjEKC2Rlc2NyaXB0aW9uGAIgASgLMhwuY3VzZi5jb21tb24udjEuQ29uc2Vuc3VzSGV4EjAKCnZvdGVfY291bnQYAyABKAsyHC5nb29nbGUucHJvdG9idWYuVUludDMyVmFsdWUSNQoPcHJvcG9zYWxfaGVpZ2h0GAQgASgLMhwuZ29vZ2xlLnByb3RvYnVmLlVJbnQzMlZhbHVlEjcKEWFjdGl2YXRpb25faGVpZ2h0GAUgASgLMhwuZ29vZ2xlLnByb3RvYnVmLlVJbnQzMlZhbHVlEkEKC2RlY2xhcmF0aW9uGAYgASgLMicuY3VzZi5tYWluY2hhaW4udjEuU2lkZWNoYWluRGVjbGFyYXRpb25IAIgBAUIOCgxfZGVjbGFyYXRpb24i0QEKF0dldFR3b1dheVBlZ0RhdGFSZXF1ZXN0EjIKDHNpZGVjaGFpbl9pZBgBIAEoCzIcLmdvb2dsZS5wcm90b2J1Zi5VSW50MzJWYWx1ZRI5ChBzdGFydF9ibG9ja19oYXNoGAIgASgLMhouY3VzZi5jb21tb24udjEuUmV2ZXJzZUhleEgAiAEBEjIKDmVuZF9ibG9ja19oYXNoGAMgASgLMhouY3VzZi5jb21tb24udjEuUmV2ZXJzZUhleEITChFfc3RhcnRfYmxvY2tfaGFzaCLlAQoYR2V0VHdvV2F5UGVnRGF0YVJlc3BvbnNlEkgKBmJsb2NrcxgBIAMoCzI4LmN1c2YubWFpbmNoYWluLnYxLkdldFR3b1dheVBlZ0RhdGFSZXNwb25zZS5SZXNwb25zZUl0ZW0afwoMUmVzcG9uc2VJdGVtEj0KEWJsb2NrX2hlYWRlcl9pbmZvGAEgASgLMiIuY3VzZi5tYWluY2hhaW4udjEuQmxvY2tIZWFkZXJJbmZvEjAKCmJsb2NrX2luZm8YAiABKAsyHC5jdXNmLm1haW5jaGFpbi52MS5CbG9ja0luZm8iTAoWU3Vic2NyaWJlRXZlbnRzUmVxdWVzdBIyCgxzaWRlY2hhaW5faWQYASABKAsyHC5nb29nbGUucHJvdG9idWYuVUludDMyVmFsdWUi4QMKF1N1YnNjcmliZUV2ZW50c1Jlc3BvbnNlEj8KBWV2ZW50GAEgASgLMjAuY3VzZi5tYWluY2hhaW4udjEuU3Vic2NyaWJlRXZlbnRzUmVzcG9uc2UuRXZlbnQahAMKBUV2ZW50ElYKDWNvbm5lY3RfYmxvY2sYASABKAsyPS5jdXNmLm1haW5jaGFpbi52MS5TdWJzY3JpYmVFdmVudHNSZXNwb25zZS5FdmVudC5Db25uZWN0QmxvY2tIABJcChBkaXNjb25uZWN0X2Jsb2NrGAIgASgLMkAuY3VzZi5tYWluY2hhaW4udjEuU3Vic2NyaWJlRXZlbnRzUmVzcG9uc2UuRXZlbnQuRGlzY29ubmVjdEJsb2NrSAAaeQoMQ29ubmVjdEJsb2NrEjcKC2hlYWRlcl9pbmZvGAEgASgLMiIuY3VzZi5tYWluY2hhaW4udjEuQmxvY2tIZWFkZXJJbmZvEjAKCmJsb2NrX2luZm8YAiABKAsyHC5jdXNmLm1haW5jaGFpbi52MS5CbG9ja0luZm8aQQoPRGlzY29ubmVjdEJsb2NrEi4KCmJsb2NrX2hhc2gYASABKAsyGi5jdXNmLmNvbW1vbi52MS5SZXZlcnNlSGV4QgcKBWV2ZW50IiQKIlN1YnNjcmliZUhlYWRlclN5bmNQcm9ncmVzc1JlcXVlc3QicwojU3Vic2NyaWJlSGVhZGVyU3luY1Byb2dyZXNzUmVzcG9uc2USOQoOY3VycmVudF9oZWlnaHQYASABKAsyHC5nb29nbGUucHJvdG9idWYuVUludDMyVmFsdWVIAIgBAUIRCg9fY3VycmVudF9oZWlnaHQqigEKB05ldHdvcmsSFwoTTkVUV09SS19VTlNQRUNJRklFRBAAEhMKD05FVFdPUktfVU5LTk9XThABEhMKD05FVFdPUktfTUFJTk5FVBACEhMKD05FVFdPUktfUkVHVEVTVBADEhIKDk5FVFdPUktfU0lHTkVUEAQSEwoPTkVUV09SS19URVNUTkVUEAUypwoKEFZhbGlkYXRvclNlcnZpY2UScQoSR2V0QmxvY2tIZWFkZXJJbmZvEiwuY3VzZi5tYWluY2hhaW4udjEuR2V0QmxvY2tIZWFkZXJJbmZvUmVxdWVzdBotLmN1c2YubWFpbmNoYWluLnYxLkdldEJsb2NrSGVhZGVySW5mb1Jlc3BvbnNlEl8KDEdldEJsb2NrSW5mbxImLmN1c2YubWFpbmNoYWluLnYxLkdldEJsb2NrSW5mb1JlcXVlc3QaJy5jdXNmLm1haW5jaGFpbi52MS5HZXRCbG9ja0luZm9SZXNwb25zZRJ6ChVHZXRCbW1IU3RhckNvbW1pdG1lbnQSLy5jdXNmLm1haW5jaGFpbi52MS5HZXRCbW1IU3RhckNvbW1pdG1lbnRSZXF1ZXN0GjAuY3VzZi5tYWluY2hhaW4udjEuR2V0Qm1tSFN0YXJDb21taXRtZW50UmVzcG9uc2USXwoMR2V0Q2hhaW5JbmZvEiYuY3VzZi5tYWluY2hhaW4udjEuR2V0Q2hhaW5JbmZvUmVxdWVzdBonLmN1c2YubWFpbmNoYWluLnYxLkdldENoYWluSW5mb1Jlc3BvbnNlElwKC0dldENoYWluVGlwEiUuY3VzZi5tYWluY2hhaW4udjEuR2V0Q2hhaW5UaXBSZXF1ZXN0GiYuY3VzZi5tYWluY2hhaW4udjEuR2V0Q2hhaW5UaXBSZXNwb25zZRJoCg9HZXRDb2luYmFzZVBTQlQSKS5jdXNmLm1haW5jaGFpbi52MS5HZXRDb2luYmFzZVBTQlRSZXF1ZXN0GiouY3VzZi5tYWluY2hhaW4udjEuR2V0Q29pbmJhc2VQU0JUUmVzcG9uc2USUAoHR2V0Q3RpcBIhLmN1c2YubWFpbmNoYWluLnYxLkdldEN0aXBSZXF1ZXN0GiIuY3VzZi5tYWluY2hhaW4udjEuR2V0Q3RpcFJlc3BvbnNlEnoKFUdldFNpZGVjaGFpblByb3Bvc2FscxIvLmN1c2YubWFpbmNoYWluLnYxLkdldFNpZGVjaGFpblByb3Bvc2Fsc1JlcXVlc3QaMC5jdXNmLm1haW5jaGFpbi52MS5HZXRTaWRlY2hhaW5Qcm9wb3NhbHNSZXNwb25zZRJiCg1HZXRTaWRlY2hhaW5zEicuY3VzZi5tYWluY2hhaW4udjEuR2V0U2lkZWNoYWluc1JlcXVlc3QaKC5jdXNmLm1haW5jaGFpbi52MS5HZXRTaWRlY2hhaW5zUmVzcG9uc2USawoQR2V0VHdvV2F5UGVnRGF0YRIqLmN1c2YubWFpbmNoYWluLnYxLkdldFR3b1dheVBlZ0RhdGFSZXF1ZXN0GisuY3VzZi5tYWluY2hhaW4udjEuR2V0VHdvV2F5UGVnRGF0YVJlc3BvbnNlEmoKD1N1YnNjcmliZUV2ZW50cxIpLmN1c2YubWFpbmNoYWluLnYxLlN1YnNjcmliZUV2ZW50c1JlcXVlc3QaKi5jdXNmLm1haW5jaGFpbi52MS5TdWJzY3JpYmVFdmVudHNSZXNwb25zZTABEo4BChtTdWJzY3JpYmVIZWFkZXJTeW5jUHJvZ3Jlc3MSNS5jdXNmLm1haW5jaGFpbi52MS5TdWJzY3JpYmVIZWFkZXJTeW5jUHJvZ3Jlc3NSZXF1ZXN0GjYuY3VzZi5tYWluY2hhaW4udjEuU3Vic2NyaWJlSGVhZGVyU3luY1Byb2dyZXNzUmVzcG9uc2UwAUKNAQoVY29tLmN1c2YubWFpbmNoYWluLnYxQg5WYWxpZGF0b3JQcm90b1ABogIDQ01YqgIRQ3VzZi5NYWluY2hhaW4uVjHKAhFDdXNmXE1haW5jaGFpblxWMeICHUN1c2ZcTWFpbmNoYWluXFYxXEdQQk1ldGFkYXRh6gITQ3VzZjo6TWFpbmNoYWluOjpWMWIGcHJvdG8z", [file_google_protobuf_wrappers, file_cusf_common_v1_common, file_cusf_mainchain_v1_common]);

/**
 * Describes the message cusf.mainchain.v1.BlockHeaderInfo.
 * Use `create(BlockHeaderInfoSchema)` to create a new message.
 */
const BlockHeaderInfoSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 0);

/**
 * Describes the message cusf.mainchain.v1.Deposit.
 * Use `create(DepositSchema)` to create a new message.
 */
const DepositSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 1);

/**
 * Describes the message cusf.mainchain.v1.Deposit.Output.
 * Use `create(Deposit_OutputSchema)` to create a new message.
 */
const Deposit_OutputSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 1, 0);

/**
 * Describes the message cusf.mainchain.v1.WithdrawalBundleEvent.
 * Use `create(WithdrawalBundleEventSchema)` to create a new message.
 */
const WithdrawalBundleEventSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 2);

/**
 * Describes the message cusf.mainchain.v1.WithdrawalBundleEvent.Event.
 * Use `create(WithdrawalBundleEvent_EventSchema)` to create a new message.
 */
const WithdrawalBundleEvent_EventSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 2, 0);

/**
 * Describes the message cusf.mainchain.v1.WithdrawalBundleEvent.Event.Failed.
 * Use `create(WithdrawalBundleEvent_Event_FailedSchema)` to create a new message.
 */
const WithdrawalBundleEvent_Event_FailedSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 2, 0, 0);

/**
 * Describes the message cusf.mainchain.v1.WithdrawalBundleEvent.Event.Succeeded.
 * Use `create(WithdrawalBundleEvent_Event_SucceededSchema)` to create a new message.
 */
const WithdrawalBundleEvent_Event_SucceededSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 2, 0, 1);

/**
 * Describes the message cusf.mainchain.v1.WithdrawalBundleEvent.Event.Submitted.
 * Use `create(WithdrawalBundleEvent_Event_SubmittedSchema)` to create a new message.
 */
const WithdrawalBundleEvent_Event_SubmittedSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 2, 0, 2);

/**
 * Describes the message cusf.mainchain.v1.BlockInfo.
 * Use `create(BlockInfoSchema)` to create a new message.
 */
const BlockInfoSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 3);

/**
 * Describes the message cusf.mainchain.v1.BlockInfo.Event.
 * Use `create(BlockInfo_EventSchema)` to create a new message.
 */
const BlockInfo_EventSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 3, 0);

/**
 * Describes the message cusf.mainchain.v1.GetBlockHeaderInfoRequest.
 * Use `create(GetBlockHeaderInfoRequestSchema)` to create a new message.
 */
const GetBlockHeaderInfoRequestSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 4);

/**
 * Describes the message cusf.mainchain.v1.GetBlockHeaderInfoResponse.
 * Use `create(GetBlockHeaderInfoResponseSchema)` to create a new message.
 */
const GetBlockHeaderInfoResponseSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 5);

/**
 * Describes the message cusf.mainchain.v1.GetBlockInfoRequest.
 * Use `create(GetBlockInfoRequestSchema)` to create a new message.
 */
const GetBlockInfoRequestSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 6);

/**
 * Describes the message cusf.mainchain.v1.GetBlockInfoResponse.
 * Use `create(GetBlockInfoResponseSchema)` to create a new message.
 */
const GetBlockInfoResponseSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 7);

/**
 * Describes the message cusf.mainchain.v1.GetBlockInfoResponse.Info.
 * Use `create(GetBlockInfoResponse_InfoSchema)` to create a new message.
 */
const GetBlockInfoResponse_InfoSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 7, 0);

/**
 * Describes the message cusf.mainchain.v1.GetBmmHStarCommitmentRequest.
 * Use `create(GetBmmHStarCommitmentRequestSchema)` to create a new message.
 */
const GetBmmHStarCommitmentRequestSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 8);

/**
 * Describes the message cusf.mainchain.v1.GetBmmHStarCommitmentResponse.
 * Use `create(GetBmmHStarCommitmentResponseSchema)` to create a new message.
 */
const GetBmmHStarCommitmentResponseSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 9);

/**
 * Describes the message cusf.mainchain.v1.GetBmmHStarCommitmentResponse.BlockNotFoundError.
 * Use `create(GetBmmHStarCommitmentResponse_BlockNotFoundErrorSchema)` to create a new message.
 */
const GetBmmHStarCommitmentResponse_BlockNotFoundErrorSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 9, 0);

/**
 * Describes the message cusf.mainchain.v1.GetBmmHStarCommitmentResponse.OptionalCommitment.
 * Use `create(GetBmmHStarCommitmentResponse_OptionalCommitmentSchema)` to create a new message.
 */
const GetBmmHStarCommitmentResponse_OptionalCommitmentSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 9, 1);

/**
 * Describes the message cusf.mainchain.v1.GetBmmHStarCommitmentResponse.Commitment.
 * Use `create(GetBmmHStarCommitmentResponse_CommitmentSchema)` to create a new message.
 */
const GetBmmHStarCommitmentResponse_CommitmentSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 9, 2);

/**
 * Describes the message cusf.mainchain.v1.GetChainInfoRequest.
 * Use `create(GetChainInfoRequestSchema)` to create a new message.
 */
const GetChainInfoRequestSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 10);

/**
 * Describes the message cusf.mainchain.v1.GetChainInfoResponse.
 * Use `create(GetChainInfoResponseSchema)` to create a new message.
 */
const GetChainInfoResponseSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 11);

/**
 * Describes the message cusf.mainchain.v1.GetChainTipRequest.
 * Use `create(GetChainTipRequestSchema)` to create a new message.
 */
const GetChainTipRequestSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 12);

/**
 * Describes the message cusf.mainchain.v1.GetChainTipResponse.
 * Use `create(GetChainTipResponseSchema)` to create a new message.
 */
const GetChainTipResponseSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 13);

/**
 * Describes the message cusf.mainchain.v1.GetCoinbasePSBTRequest.
 * Use `create(GetCoinbasePSBTRequestSchema)` to create a new message.
 */
const GetCoinbasePSBTRequestSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 14);

/**
 * Describes the message cusf.mainchain.v1.GetCoinbasePSBTRequest.ProposeSidechain.
 * Use `create(GetCoinbasePSBTRequest_ProposeSidechainSchema)` to create a new message.
 */
const GetCoinbasePSBTRequest_ProposeSidechainSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 14, 0);

/**
 * Describes the message cusf.mainchain.v1.GetCoinbasePSBTRequest.AckSidechain.
 * Use `create(GetCoinbasePSBTRequest_AckSidechainSchema)` to create a new message.
 */
const GetCoinbasePSBTRequest_AckSidechainSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 14, 1);

/**
 * Describes the message cusf.mainchain.v1.GetCoinbasePSBTRequest.ProposeBundle.
 * Use `create(GetCoinbasePSBTRequest_ProposeBundleSchema)` to create a new message.
 */
const GetCoinbasePSBTRequest_ProposeBundleSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 14, 2);

/**
 * Describes the message cusf.mainchain.v1.GetCoinbasePSBTRequest.AckBundles.
 * Use `create(GetCoinbasePSBTRequest_AckBundlesSchema)` to create a new message.
 */
const GetCoinbasePSBTRequest_AckBundlesSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 14, 3);

/**
 * Describes the message cusf.mainchain.v1.GetCoinbasePSBTRequest.AckBundles.RepeatPrevious.
 * Use `create(GetCoinbasePSBTRequest_AckBundles_RepeatPreviousSchema)` to create a new message.
 */
const GetCoinbasePSBTRequest_AckBundles_RepeatPreviousSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 14, 3, 0);

/**
 * Describes the message cusf.mainchain.v1.GetCoinbasePSBTRequest.AckBundles.LeadingBy50.
 * Use `create(GetCoinbasePSBTRequest_AckBundles_LeadingBy50Schema)` to create a new message.
 */
const GetCoinbasePSBTRequest_AckBundles_LeadingBy50Schema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 14, 3, 1);

/**
 * Describes the message cusf.mainchain.v1.GetCoinbasePSBTRequest.AckBundles.Upvotes.
 * Use `create(GetCoinbasePSBTRequest_AckBundles_UpvotesSchema)` to create a new message.
 */
const GetCoinbasePSBTRequest_AckBundles_UpvotesSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 14, 3, 2);

/**
 * Describes the message cusf.mainchain.v1.GetCoinbasePSBTResponse.
 * Use `create(GetCoinbasePSBTResponseSchema)` to create a new message.
 */
const GetCoinbasePSBTResponseSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 15);

/**
 * Describes the message cusf.mainchain.v1.GetCtipRequest.
 * Use `create(GetCtipRequestSchema)` to create a new message.
 */
const GetCtipRequestSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 16);

/**
 * Describes the message cusf.mainchain.v1.GetCtipResponse.
 * Use `create(GetCtipResponseSchema)` to create a new message.
 */
const GetCtipResponseSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 17);

/**
 * Describes the message cusf.mainchain.v1.GetCtipResponse.Ctip.
 * Use `create(GetCtipResponse_CtipSchema)` to create a new message.
 */
const GetCtipResponse_CtipSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 17, 0);

/**
 * Describes the message cusf.mainchain.v1.GetSidechainProposalsRequest.
 * Use `create(GetSidechainProposalsRequestSchema)` to create a new message.
 */
const GetSidechainProposalsRequestSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 18);

/**
 * Describes the message cusf.mainchain.v1.GetSidechainProposalsResponse.
 * Use `create(GetSidechainProposalsResponseSchema)` to create a new message.
 */
const GetSidechainProposalsResponseSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 19);

/**
 * Describes the message cusf.mainchain.v1.GetSidechainProposalsResponse.SidechainProposal.
 * Use `create(GetSidechainProposalsResponse_SidechainProposalSchema)` to create a new message.
 */
const GetSidechainProposalsResponse_SidechainProposalSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 19, 0);

/**
 * Describes the message cusf.mainchain.v1.GetSidechainsRequest.
 * Use `create(GetSidechainsRequestSchema)` to create a new message.
 */
const GetSidechainsRequestSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 20);

/**
 * Describes the message cusf.mainchain.v1.GetSidechainsResponse.
 * Use `create(GetSidechainsResponseSchema)` to create a new message.
 */
const GetSidechainsResponseSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 21);

/**
 * Describes the message cusf.mainchain.v1.GetSidechainsResponse.SidechainInfo.
 * Use `create(GetSidechainsResponse_SidechainInfoSchema)` to create a new message.
 */
const GetSidechainsResponse_SidechainInfoSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 21, 0);

/**
 * Describes the message cusf.mainchain.v1.GetTwoWayPegDataRequest.
 * Use `create(GetTwoWayPegDataRequestSchema)` to create a new message.
 */
const GetTwoWayPegDataRequestSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 22);

/**
 * Describes the message cusf.mainchain.v1.GetTwoWayPegDataResponse.
 * Use `create(GetTwoWayPegDataResponseSchema)` to create a new message.
 */
const GetTwoWayPegDataResponseSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 23);

/**
 * Describes the message cusf.mainchain.v1.GetTwoWayPegDataResponse.ResponseItem.
 * Use `create(GetTwoWayPegDataResponse_ResponseItemSchema)` to create a new message.
 */
const GetTwoWayPegDataResponse_ResponseItemSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 23, 0);

/**
 * Describes the message cusf.mainchain.v1.SubscribeEventsRequest.
 * Use `create(SubscribeEventsRequestSchema)` to create a new message.
 */
const SubscribeEventsRequestSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 24);

/**
 * Describes the message cusf.mainchain.v1.SubscribeEventsResponse.
 * Use `create(SubscribeEventsResponseSchema)` to create a new message.
 */
const SubscribeEventsResponseSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 25);

/**
 * Describes the message cusf.mainchain.v1.SubscribeEventsResponse.Event.
 * Use `create(SubscribeEventsResponse_EventSchema)` to create a new message.
 */
const SubscribeEventsResponse_EventSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 25, 0);

/**
 * Describes the message cusf.mainchain.v1.SubscribeEventsResponse.Event.ConnectBlock.
 * Use `create(SubscribeEventsResponse_Event_ConnectBlockSchema)` to create a new message.
 */
const SubscribeEventsResponse_Event_ConnectBlockSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 25, 0, 0);

/**
 * Describes the message cusf.mainchain.v1.SubscribeEventsResponse.Event.DisconnectBlock.
 * Use `create(SubscribeEventsResponse_Event_DisconnectBlockSchema)` to create a new message.
 */
const SubscribeEventsResponse_Event_DisconnectBlockSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 25, 0, 1);

/**
 * Describes the message cusf.mainchain.v1.SubscribeHeaderSyncProgressRequest.
 * Use `create(SubscribeHeaderSyncProgressRequestSchema)` to create a new message.
 */
const SubscribeHeaderSyncProgressRequestSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 26);

/**
 * Describes the message cusf.mainchain.v1.SubscribeHeaderSyncProgressResponse.
 * Use `create(SubscribeHeaderSyncProgressResponseSchema)` to create a new message.
 */
const SubscribeHeaderSyncProgressResponseSchema = /*@__PURE__*/
  messageDesc(file_cusf_mainchain_v1_validator, 27);

/**
 * Describes the enum cusf.mainchain.v1.Network.
 */
const NetworkSchema = /*@__PURE__*/
  enumDesc(file_cusf_mainchain_v1_validator, 0);

/**
 * @generated from enum cusf.mainchain.v1.Network
 */
const Network = /*@__PURE__*/
  tsEnum(NetworkSchema);

/**
 * @generated from service cusf.mainchain.v1.ValidatorService
 */
const ValidatorService = /*@__PURE__*/
  serviceDesc(file_cusf_mainchain_v1_validator, 0);


exports.file_cusf_mainchain_v1_validator = file_cusf_mainchain_v1_validator;
exports.BlockHeaderInfoSchema = BlockHeaderInfoSchema;
exports.DepositSchema = DepositSchema;
exports.Deposit_OutputSchema = Deposit_OutputSchema;
exports.WithdrawalBundleEventSchema = WithdrawalBundleEventSchema;
exports.WithdrawalBundleEvent_EventSchema = WithdrawalBundleEvent_EventSchema;
exports.WithdrawalBundleEvent_Event_FailedSchema = WithdrawalBundleEvent_Event_FailedSchema;
exports.WithdrawalBundleEvent_Event_SucceededSchema = WithdrawalBundleEvent_Event_SucceededSchema;
exports.WithdrawalBundleEvent_Event_SubmittedSchema = WithdrawalBundleEvent_Event_SubmittedSchema;
exports.BlockInfoSchema = BlockInfoSchema;
exports.BlockInfo_EventSchema = BlockInfo_EventSchema;
exports.GetBlockHeaderInfoRequestSchema = GetBlockHeaderInfoRequestSchema;
exports.GetBlockHeaderInfoResponseSchema = GetBlockHeaderInfoResponseSchema;
exports.GetBlockInfoRequestSchema = GetBlockInfoRequestSchema;
exports.GetBlockInfoResponseSchema = GetBlockInfoResponseSchema;
exports.GetBlockInfoResponse_InfoSchema = GetBlockInfoResponse_InfoSchema;
exports.GetBmmHStarCommitmentRequestSchema = GetBmmHStarCommitmentRequestSchema;
exports.GetBmmHStarCommitmentResponseSchema = GetBmmHStarCommitmentResponseSchema;
exports.GetBmmHStarCommitmentResponse_BlockNotFoundErrorSchema = GetBmmHStarCommitmentResponse_BlockNotFoundErrorSchema;
exports.GetBmmHStarCommitmentResponse_OptionalCommitmentSchema = GetBmmHStarCommitmentResponse_OptionalCommitmentSchema;
exports.GetBmmHStarCommitmentResponse_CommitmentSchema = GetBmmHStarCommitmentResponse_CommitmentSchema;
exports.GetChainInfoRequestSchema = GetChainInfoRequestSchema;
exports.GetChainInfoResponseSchema = GetChainInfoResponseSchema;
exports.GetChainTipRequestSchema = GetChainTipRequestSchema;
exports.GetChainTipResponseSchema = GetChainTipResponseSchema;
exports.GetCoinbasePSBTRequestSchema = GetCoinbasePSBTRequestSchema;
exports.GetCoinbasePSBTRequest_ProposeSidechainSchema = GetCoinbasePSBTRequest_ProposeSidechainSchema;
exports.GetCoinbasePSBTRequest_AckSidechainSchema = GetCoinbasePSBTRequest_AckSidechainSchema;
exports.GetCoinbasePSBTRequest_ProposeBundleSchema = GetCoinbasePSBTRequest_ProposeBundleSchema;
exports.GetCoinbasePSBTRequest_AckBundlesSchema = GetCoinbasePSBTRequest_AckBundlesSchema;
exports.GetCoinbasePSBTRequest_AckBundles_RepeatPreviousSchema = GetCoinbasePSBTRequest_AckBundles_RepeatPreviousSchema;
exports.GetCoinbasePSBTRequest_AckBundles_LeadingBy50Schema = GetCoinbasePSBTRequest_AckBundles_LeadingBy50Schema;
exports.GetCoinbasePSBTRequest_AckBundles_UpvotesSchema = GetCoinbasePSBTRequest_AckBundles_UpvotesSchema;
exports.GetCoinbasePSBTResponseSchema = GetCoinbasePSBTResponseSchema;
exports.GetCtipRequestSchema = GetCtipRequestSchema;
exports.GetCtipResponseSchema = GetCtipResponseSchema;
exports.GetCtipResponse_CtipSchema = GetCtipResponse_CtipSchema;
exports.GetSidechainProposalsRequestSchema = GetSidechainProposalsRequestSchema;
exports.GetSidechainProposalsResponseSchema = GetSidechainProposalsResponseSchema;
exports.GetSidechainProposalsResponse_SidechainProposalSchema = GetSidechainProposalsResponse_SidechainProposalSchema;
exports.GetSidechainsRequestSchema = GetSidechainsRequestSchema;
exports.GetSidechainsResponseSchema = GetSidechainsResponseSchema;
exports.GetSidechainsResponse_SidechainInfoSchema = GetSidechainsResponse_SidechainInfoSchema;
exports.GetTwoWayPegDataRequestSchema = GetTwoWayPegDataRequestSchema;
exports.GetTwoWayPegDataResponseSchema = GetTwoWayPegDataResponseSchema;
exports.GetTwoWayPegDataResponse_ResponseItemSchema = GetTwoWayPegDataResponse_ResponseItemSchema;
exports.SubscribeEventsRequestSchema = SubscribeEventsRequestSchema;
exports.SubscribeEventsResponseSchema = SubscribeEventsResponseSchema;
exports.SubscribeEventsResponse_EventSchema = SubscribeEventsResponse_EventSchema;
exports.SubscribeEventsResponse_Event_ConnectBlockSchema = SubscribeEventsResponse_Event_ConnectBlockSchema;
exports.SubscribeEventsResponse_Event_DisconnectBlockSchema = SubscribeEventsResponse_Event_DisconnectBlockSchema;
exports.SubscribeHeaderSyncProgressRequestSchema = SubscribeHeaderSyncProgressRequestSchema;
exports.SubscribeHeaderSyncProgressResponseSchema = SubscribeHeaderSyncProgressResponseSchema;
exports.NetworkSchema = NetworkSchema;
exports.Network = Network;
exports.ValidatorService = ValidatorService;
