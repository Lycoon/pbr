export default `
precision highp float;

#define M_PI 3.1415926535897932384626433832795

in vec3 vNormalWS;
in vec3 vPositionWS;
out vec4 outFragColor;


// Structures
// --------------------
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


// Cook-Torrance BRDF
// --------------------
float distributionGGX(vec3 N, vec3 H, float roughness)
{
    float a = roughness*roughness;
    float a2 = a*a;
    float NdotH = max(dot(N, H), 0.0);
    float NdotH2 = NdotH*NdotH;

    float nom = a2;
    float denom = (NdotH2 * (a2 - 1.0) + 1.0);
    denom = M_PI * denom * denom;

    return nom / denom;
}

float geometrySchlickGGX(float NdotV, float roughness)
{
    float r = (roughness + 1.0);
    float k = (r*r) / 8.0;

    float nom = NdotV;
    float denom = NdotV * (1.0 - k) + k;

    return nom / denom;
}

float geometrySmith(vec3 N, vec3 V, vec3 L, float roughness)
{
    float NdotV = max(dot(N, V), 0.0);
    float NdotL = max(dot(N, L), 0.0);
    float ggx2 = geometrySchlickGGX(NdotV, roughness);
    float ggx1 = geometrySchlickGGX(NdotL, roughness);

    return ggx1 * ggx2;
}

vec3 fresnelSchlick(float cosTheta, vec3 f0)
{
    return f0 + (1.0 - f0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}


// Color space conversions
// --------------------
vec4 sRGBToLinear( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 LinearTosRGB( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}


void main()
{
  vec3 albedo = sRGBToLinear(vec4(uMaterial.albedo, 1.0)).rgb;
  vec3 V = normalize(uCamera.position - vPositionWS);
  vec3 N = normalize(vNormalWS);
  
  float roughness = uMaterial.roughness;
  float metallic = uMaterial.metallic;

  vec3 f0 = vec3(0.04);
  f0 = mix(f0, albedo, metallic);
  
  vec3 color = vec3(0.0, 0.0, 0.0);
  for (int i = 0; i < POINT_LIGHT_COUNT; i++)
  {
    // Compute light direction
    vec3 lightDir = uLights[i].position - vPositionWS;
    vec3 lightDirNorm = normalize(lightDir);

    // Inverse square falloff
    float dst = length(lightDir);
    float inverse = 1.0 / (4.0 * M_PI * dst * dst);
    vec3 radiance = uLights[i].color * uLights[i].intensity * inverse;

    // Cook-Torrance BRDF
    vec3 H = normalize(V + lightDirNorm);
    float NDF = distributionGGX(N, H, roughness);
    float G = geometrySmith(N, V, lightDirNorm, roughness);
    vec3 F = fresnelSchlick(clamp(dot(H, V), 0.0, 1.0), f0);

    vec3 nom = NDF * G * F; 
    float denom = 4.0 * max(dot(N, V), 0.0) * max(dot(N, lightDirNorm), 0.0) + 0.0001;
    vec3 specular = nom / denom;

    // Calculate final color
    vec3 kS = F;
    vec3 kD = vec3(1.0) - kS;
    kD *= 1.0 - metallic;
    vec3 diffuse = kD * albedo / M_PI;

    float NdotL = max(dot(N, lightDirNorm), 0.0);
    color.rgb += (diffuse + specular) * radiance * NdotL;
  }

  // Ambient lighting
  float ao = 1.0;
  color += vec3(0.03) * albedo * ao;
  
  // Gamma correction
  color = pow(color / (color + vec3(1.0)), vec3(1.0 / 2.2));
  
  // Linear to sRGB
  outFragColor.rgba = LinearTosRGB(vec4(color, 1.0));
}
`;
