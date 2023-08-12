#version 300 es

precision highp float;
out vec4 outColor;

in vec2 v_uv;

uniform float sharpness;
uniform vec4 color;
uniform sampler2D gridTexture;

void main()
{
    float sdf = texture(gridTexture, v_uv).x;
    float alpha = 1.0 - (sdf - 0.6) * sharpness;
    alpha = clamp(alpha, 0.0, 1.0);
    outColor = color * alpha;
}
