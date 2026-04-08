package com.esb.recrutementRH.config;

import com.esb.recrutementRH.user.service.UserDetailsServiceImpl;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private UserDetailsServiceImpl userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        String queryString = request.getQueryString();

        // Super verbose logging for document access to help the user debug
        if (path.contains("/api/admin/document/")) {
            System.out.println("\n[JwtFilter] >>> DOCUMENT ACCESS ATTEMPT <<<");
            System.out.println("[JwtFilter] Method: " + request.getMethod());
            System.out.println("[JwtFilter] Path: " + path);
            System.out.println("[JwtFilter] Query: " + queryString);
            System.out.println("[JwtFilter] Auth Header: " + request.getHeader("Authorization"));

            // Log ALL parameters to see if 'token' is there under a different name or with
            // a space
            java.util.Enumeration<String> params = request.getParameterNames();
            while (params.hasMoreElements()) {
                String p = params.nextElement();
                System.out.println("[JwtFilter] Param: '" + p + "' = '" + request.getParameter(p) + "'");
            }
        }

        try {
            String jwt = parseJwt(request);
            if (jwt != null) {
                if (jwtUtils.validateJwtToken(jwt)) {
                    String username = jwtUtils.getUserNameFromJwtToken(jwt);
                    UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                    UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.getAuthorities());
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    SecurityContextHolder.getContext().setAuthentication(authentication);
                    if (path.contains("/api/admin/document/")) {
                        System.out.println(
                                "[JwtFilter] SUCCESS: Authenticated user '" + username + "' for document access.");
                    }
                } else {
                    if (path.contains("/api/admin/document/")) {
                        System.out.println("[JwtFilter] FAILURE: JWT was provided but is INVALID.");
                    }
                }
            } else {
                if (path.contains("/api/admin/document/")) {
                    System.out.println("[JwtFilter] FAILURE: No JWT found in headers or URL parameters.");
                }
            }
        } catch (Exception e) {
            System.err.println("[JwtFilter] ERROR: " + e.getMessage());
        }

        filterChain.doFilter(request, response);
    }

    private String parseJwt(HttpServletRequest request) {
        // 1. Check Header
        String headerAuth = request.getHeader("Authorization");
        if (StringUtils.hasText(headerAuth) && headerAuth.startsWith("Bearer ")) {
            return headerAuth.substring(7);
        }

        // 2. Check Standard Parameter (handles both query and body)
        String tokenParam = request.getParameter("token");
        if (!StringUtils.hasText(tokenParam)) {
            tokenParam = request.getParameter("TOKEN"); // Case-insensitive just in case
        }

        // 3. Fallback: Manual Query String parsing (bulletproof)
        if (!StringUtils.hasText(tokenParam)) {
            String query = request.getQueryString();
            if (StringUtils.hasText(query)) {
                for (String part : query.split("&")) {
                    String[] kv = part.split("=");
                    if (kv.length == 2 && (kv[0].equalsIgnoreCase("token") || kv[0].equalsIgnoreCase("jwt"))) {
                        tokenParam = kv[1];
                        break;
                    }
                }
            }
        }

        if (StringUtils.hasText(tokenParam)) {
            // Robustness: strip "Bearer " if the user accidentally included it in the URL
            if (tokenParam.startsWith("Bearer%20") || tokenParam.startsWith("Bearer ")) {
                return tokenParam.substring(7).trim();
            }
            return tokenParam.trim();
        }

        return null;
    }
}
