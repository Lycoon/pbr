export default `
precision highp float;

const float M_PI = 3.1415926535897932384626433832795;
const float RECIPROCAL_PI = 0.31830988618;
const float RECIPROCAL_PI2 = 0.15915494;

// Inputs
in vec3 vNormalWS;
in vec3 vPositionWS;

// Outputs
out vec4 outFragColor;


// Structures
// --------------------
uniform sampler2D uPreComputedIBL;
uniform sampler2D uDiffuseIBL;
uniform sampler2D uSpecularIBL;

struct Material
{
  vec3 albedo;
  float metallic;
  float roughness;
};
uniform Material uMaterial;

struct PointLight
{
  vec3 color;
  vec3 position;
  float intensity;
};
uniform PointLight uLights[POINT_LIGHT_COUNT];

struct Camera
{
  vec3 position;
};
uniform Camera uCamera;


// Given function
// --------------------
vec2 cartesianToPolar(vec3 n) {
    vec2 uv;
    uv.x = atan(n.z, n.x) * RECIPROCAL_PI2 + 0.5;
    uv.y = asin(n.y) * RECIPROCAL_PI + 0.5;
    return uv;
}


// Color space conversions
// --------------------
vec3 decodeRGBM(vec4 rgbm) {
  return 5.0 * rgbm.rgb * rgbm.a;
}
vec4 sRGBToLinear( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 LinearTosRGB( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}


// BRDF
// --------------------
vec3 fresnelSchlick(float cosTheta, vec3 f0)
{
    return f0 + (1.0 - f0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

vec2 getSpecCoord(float roughness, vec2 v) {
  float pow2 = pow(2.0, roughness);

  float x = v.x / pow2;
  float y = v.y / pow(2.0, roughness + 1.0) + 1.0 - (1.0 / pow2);

  return vec2(x, y);
}

vec3 fetchPrefilteredSpec(float roughness, vec3 reflected) {
  vec2 reflectedPolar = cartesianToPolar(reflected);
  float mip = roughness * 5.0;
  float mip0 = floor(mip);
  float mip1 = mip0 + 1.0;

  vec2 mipmap0 = getSpecCoord(mip0, reflectedPolar);
  vec2 mipmap1 = getSpecCoord(mip1, reflectedPolar);
  vec3 color0 = decodeRGBM(texture(uSpecularIBL, mipmap0));
  vec3 color1 = decodeRGBM(texture(uSpecularIBL, mipmap1));

  return mix(color0, color1, mip - mip0);
}


void main()
{
  vec2 uv = cartesianToPolar(vNormalWS);
  uv.y = 1.0 - uv.y; // flip texture vertically

  vec3 cameraView = normalize(uCamera.position - vPositionWS);
  vec3 albedo = sRGBToLinear(vec4(uMaterial.albedo, 1.0)).rgb;
  vec3 textureColor = decodeRGBM(texture(uDiffuseIBL, uv));

  // Diffuse
  vec3 f0 = vec3(0.04);
  f0 = mix(f0, albedo, uMaterial.metallic);

  vec3 kS = fresnelSchlick(max(dot(cameraView, vNormalWS), 0.0), f0);
  vec3 kD = (1.0 - kS) * (1.0 - uMaterial.metallic) * albedo;
  vec3 diffBRDF = kD * textureColor;

  // Specular
  vec3 reflected = reflect(-cameraView, vNormalWS);
  vec3 prefilteredSpec = fetchPrefilteredSpec(uMaterial.roughness, reflected);

  vec2 brdf = texture(uPreComputedIBL, vec2(max(dot(vNormalWS, cameraView), 0.0), uMaterial.roughness)).xy;
  vec3 specBRDF = prefilteredSpec * (kS * brdf.x + brdf.y);
  
  vec3 gi = diffBRDF + specBRDF;

  // Linear to sRGB
  outFragColor.rgba = LinearTosRGB(vec4(gi, 1.0));
}
`;
