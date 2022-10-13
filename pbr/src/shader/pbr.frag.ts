export default `
precision highp float;

out vec4 outFragColor;
in vec3 vNormalWS;
in vec3 vPositionWS;

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

// From three.js
vec4 sRGBToLinear( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}

// From three.js
vec4 LinearTosRGB( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}

void main()
{
  // Lambertian diffuse
  vec3 albedo = sRGBToLinear(vec4(uMaterial.albedo, 1.0)).rgb;
  vec3 N = normalize(vNormalWS);
  
  vec3 color = vec3(0, 0, 0);
  for (int i = 0; i < POINT_LIGHT_COUNT; i++)
  {
    // Compute light direction
    vec3 lightDir = uLights[i].position - vPositionWS;
    vec3 lightDirNorm = normalize(lightDir);

    // Inverse square falloff
    float dst = length(lightDir);
    float inverse = 1.0 / (dst * dst);

    // Diffuse
    float diffuse = max(dot(N, lightDirNorm), 0.0);
    color.rgb += albedo * uLights[i].color * uLights[i].intensity * diffuse * inverse;
  }

  // Gamma correction
  color = pow(color / (color + vec3(1.0)), vec3(1.0 / 2.2));
  
  // Linear to sRGB
  outFragColor.rgba = LinearTosRGB(vec4(color, 1.0));
}
`;
