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
};
uniform Model uModel;

struct Camera
{
  mat4 projection;
  mat4 view;
  vec3 position;
};
uniform Camera uCamera;

void main()
{
  vec3 worldPos = vec3(uModel.transform * vec4(in_position, 1.0));
  mat4 projection = uCamera.projection;
  mat4 view = uCamera.view;

  gl_Position = projection * view * vec4(worldPos, 1.0);

  vPositionWS = in_position;
  vNormalWS = in_normal;
}
`;
