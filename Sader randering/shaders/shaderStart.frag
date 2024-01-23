#version 410 core
#define NR_POINT_LIGHTS 1

in vec3 fNormal;
in vec4 fPosEye;
in vec2 fTexCoords;
in vec4 fragPosLightSpace;

out vec4 fColor;

uniform mat4 view2;

//lighting
uniform	vec3 lightDir;
uniform	vec3 lightColor;

//texture
uniform sampler2D diffuseTexture;
uniform sampler2D specularTexture;
uniform sampler2D shadowMap;

//PointLight
uniform vec3 pposition;

uniform float pconstant;
uniform float plinear;
uniform float pquadratic;  

uniform vec3 pambient;
uniform vec3 pdiffuse;
uniform vec3 pspecular;

//Fog
uniform bool isFog;

//Tunring on/off the light
uniform bool isLight;

vec3 ambient;
vec3 diffuse;
vec3 specular;

vec3 normalEye;
vec3 viewDirN;

float ambientStrength = 0.2f;
float specularStrength = 0.5f;
float shininess = 32.0f;

vec3 CalcPointLight(vec3 normal, vec3 fragPos, vec3 viewDir){
	vec3 mata=( view2*vec4(pposition,1.0f) ).rgb;
    vec3 lightDir = normalize(viewDir - fragPos);
    // diffuse shading
    float diff = max(dot(normal, lightDir), 0.0);
    // specular shading
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = 16.0f;
    // attenuation
    float distance = length(mata - fragPos);
    float attenuation = 1.0 / (pconstant + plinear * distance + pquadratic * (distance * distance));    
    // combine results
    vec3 ambient  = pambient  * vec3(texture(diffuseTexture, fTexCoords).rgb);
    vec3 diffuse  = pdiffuse  * diff * vec3(texture(diffuseTexture, fTexCoords).rgb);
    vec3 specular = pspecular * spec * vec3(texture(specularTexture, fTexCoords).rgb);
    ambient  *= attenuation;
    diffuse  *= attenuation;
    specular *= attenuation;
    return (ambient + diffuse + specular);
} 
float computeFog()
{
 float fogDensity = 0.015f;
 float fragmentDistance = length(fPosEye);
 float fogFactor = exp(-pow(fragmentDistance * fogDensity, 2));

 return clamp(fogFactor, 0.0f, 1.0f);
}

float computeShadow()
{
	// perform perspective divide
	vec3 normalizedCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;

	// Transform to [0,1] range
	normalizedCoords = normalizedCoords * 0.5 + 0.5;

	if (normalizedCoords.z > 1.0f)
		return 0.0f;

	// Get closest depth value from light's perspective
	float closestDepth = texture(shadowMap, normalizedCoords.xy).r;
	
	// Get depth of current fragment from light's perspective
	float currentDepth = normalizedCoords.z;

	// Check whether current frag pos is in shadow
	//float shadow = currentDepth > closestDepth ? 1.0 : 0.0;

	// Check whether current frag pos is in shadow
	//float bias1 = 0.005f;
	//float shadow1 = currentDepth - bias1 > closestDepth ? 1.0f : 0.0f;

	// Check whether current frag pos is in shadow
	float bias2 = max(0.05f * (1.0f - dot(normalize(fNormal), lightDir)), 0.005f);
	float shadow2 = currentDepth - bias2 > closestDepth ? 1.0f : 0.0f;

	return shadow2;

}
void computeLightComponents()
{		
	vec3 cameraPosEye = vec3(0.0f);//in eye coordinates, the viewer is situated at the origin
	
	//transform normal
	vec3 normalEye = normalize(fNormal);	
	
	//compute light direction
	vec3 lightDirN = normalize(lightDir);
	
	//compute view direction 
	vec3 viewDirN = normalize(cameraPosEye - fPosEye.xyz);
		
	//compute ambient light
	ambient = ambientStrength * lightColor;
	
	//compute diffuse light
	diffuse = max(dot(normalEye, lightDirN), 0.0f) * lightColor;
	
	//compute specular light
	vec3 reflection = reflect(-lightDirN, normalEye);
	float specCoeff = pow(max(dot(viewDirN, reflection), 0.0f), shininess);
	specular = specularStrength * specCoeff * lightColor ;
}

void main() 
{
	computeLightComponents();
	float shadow = computeShadow();
	float fogFactor = computeFog();
	vec4 fogColor = vec4(0.5f, 0.5f, 0.5f, 1.0f);
	
	ambient *= texture(diffuseTexture, fTexCoords).rgb;
	diffuse *= texture(diffuseTexture, fTexCoords).rgb;
	specular *= texture(specularTexture, fTexCoords).rgb;
	vec3 color;
	if(isLight)
		 color = min((ambient + (1.0f - shadow)*diffuse) + (1.0f - shadow)*specular, 1.0f);
	else
		 color = vec3(0.0f, 0.0f, 0.0f);
	
	vec3 colorSemiFinal = min((ambient + diffuse) + specular, color);

    vec3 colorFinal = CalcPointLight(normalEye,fPosEye.rgb, viewDirN) + vec3(colorSemiFinal);
	
	if(isFog)
		colorFinal = (fogColor * (1 - fogFactor) + vec4(colorFinal,1.0f) * fogFactor).rgb;
    
   fColor = vec4(colorFinal, 1.0f);
}
