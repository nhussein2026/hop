# Hop Architecture

## Purpose

This document describes the technical architecture of Hop and the boundaries
between the web application, API, domain, validation, and persistence layers.

## High-Level Architecture

```text
React + TypeScript + PWA
            |
            | HTTP / JSON
            v
Node.js + TypeScript API
            |
            v
Application / Business Logic
            |
            v
SQLite