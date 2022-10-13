export default `

precision highp float;

//in mat4 in_transform;
in vec3 in_position;
in vec3 in_normal;
#ifdef USE_UV
  in vec2 in_uv;
#endif // USE_UV

/**
 * Varyings.
 */

out vec3 vPositionWS;
out vec3 vNormalWS;
#ifdef USE_UV
  out vec2 vUv;
#endif // USE_UV

/**
 * Uniforms List
 */

struct Model
{
  mat4 localToProjection;
  mat4 transform;
  mat4 view;
};
uniform Model uModel;

struct Camera
{
  vec3 position;
};
uniform Camera uCamera;

void main()
{
  vec4 positionLocal = vec4(in_position, 1.0);
  gl_Position = uModel.localToProjection * uModel.transform * positionLocal;

  vPositionWS = vec3(uModel.transform * positionLocal);
  vNormalWS = in_normal;
}
`;
